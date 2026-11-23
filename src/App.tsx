import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddAppModal } from './components/AddAppModal';
import { AdminServicesView } from './components/AdminServicesView';
import { AppListDrawer } from './components/AppListDrawer';
import { ChairmanLoginModal } from './components/ChairmanLoginModal';
import { DesktopLauncher } from './components/DesktopLauncher';
import { isMusicApp, MusicPlayerProvider, MusicPlayerSurface, useMusicLauncher } from './components/MusicPlayer';
import { LockScreen } from './components/LockScreen';
import { PagedAppGrid } from './components/PagedAppGrid';
import { PhoneNavBar } from './components/PhoneNavBar';
import { ServiceViewport, type ServiceViewportHandle } from './components/ServiceViewport';
import { UpdateLogView } from './components/UpdateLogView';
import { WallpaperModal } from './components/WallpaperModal';
import { WidgetHome } from './components/WidgetHome';
import { mergeServerCatalog, readServerCatalog, readWebCatalog } from './data/catalog';
import { DoubleBackExitGuard } from './data/iframeHistory';
import { ADMIN_START, SLOTS_PER_PAGE, TOTAL_SLOTS, getPageStarts, isAdminPage, placeWebApps } from './data/layout';
import {
  ADMIN_ADD_APP,
  ADMIN_GATE_APP,
  ADMIN_WALLPAPER_SRC,
  CORE_ADMIN_APPS,
  DEFAULT_SERVICES,
  LAUNCHER_WALLPAPERS,
  MOMENTS_APP,
} from './data/services';
import { LauncherApp } from './types/launcher';

const CUSTOM_APPS_KEY = 'hd2_launcher_custom_apps_v2';
const SLOTS_STORAGE_KEY = 'hd2_launcher_slots_v7';
const HOME_WP_KEY = 'hd2_launcher_home_wp_v3';
const LOCK_WP_KEY = 'hd2_launcher_lock_wp_v3';

const ADMIN_GRADIENTS = [
  'from-rose-500 via-red-600 to-orange-700',
  'from-amber-500 via-orange-600 to-rose-700',
  'from-sky-500 via-indigo-600 to-violet-700',
  'from-emerald-500 via-teal-600 to-cyan-700',
  'from-purple-500 via-fuchsia-600 to-pink-700',
];

interface AuthServiceRow {
  slug: string;
  title: string;
  description?: string;
  href: string;
  enabled?: boolean;
}

// Seed the original Web-HQ layout before the catalog arrives.
const INITIAL_WEB_APP_IDS = [
  'webhq-main',
  'webhq-technical-hub',
  'webhq-diary',
  'app-todo-master',
  'app-photos',
  'app-midpoint',
  'app-film-studio',
  'app-shutterplate',
  'app-dos-player',
  'app-markdown-viewer',
  'app-machine-learning-lab',
  'game-valkyrie-eira',
  'game-particle-beat',
  'game-valkyrie',
  'game-chibilink',
];

function buildInitialSlots(): (string | null)[] {
  const slots: (string | null)[] = Array(TOTAL_SLOTS).fill(null);

  // Page 1 (slots 0..19): Server-HQ from top
  DEFAULT_SERVICES.forEach((app, idx) => {
    if (idx < SLOTS_PER_PAGE) {
      slots[idx] = app.id;
    }
  });

  INITIAL_WEB_APP_IDS.forEach((id, index) => { slots[SLOTS_PER_PAGE + index] = id; });

  // Page 3 (slot 59 = 5행 4열 우하단): Admin SSO gate button
  slots[SLOTS_PER_PAGE * 3 - 1] = ADMIN_GATE_APP.id;

  return slots;
}

function Launcher() {
  const music = useMusicLauncher();
  const [isLocked, setIsLocked] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false,
  );
  const [ssoAuthenticated, setSsoAuthenticated] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const displayMode = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
    const updateAppHeight = () => {
      const installed = displayMode.matches || Boolean((navigator as { standalone?: boolean }).standalone);
      if (installed) {
        // iOS home-screen mode needs the large viewport, not visualViewport.height.
        root.style.setProperty('--app-height', '100lvh');
        return;
      }
      const height = window.visualViewport?.height ?? window.innerHeight;
      if (height > 0) root.style.setProperty('--app-height', `${Math.floor(height)}px`);
    };

    updateAppHeight();
    displayMode.addEventListener('change', updateAppHeight);
    window.addEventListener('resize', updateAppHeight);
    window.addEventListener('orientationchange', updateAppHeight);
    window.visualViewport?.addEventListener('resize', updateAppHeight);
    return () => {
      displayMode.removeEventListener('change', updateAppHeight);
      window.removeEventListener('resize', updateAppHeight);
      window.removeEventListener('orientationchange', updateAppHeight);
      window.visualViewport?.removeEventListener('resize', updateAppHeight);
    };
  }, []);
  const [adminPagesOpen, setAdminPagesOpen] = useState(false);
  const [adminServices, setAdminServices] = useState<LauncherApp[]>([]);
  const [webHqApps, setWebHqApps] = useState<LauncherApp[]>([]);
  const [serverApps, setServerApps] = useState<LauncherApp[]>([]);
  const [aiApps, setAiApps] = useState<LauncherApp[]>([]);

  const [customApps, setCustomApps] = useState<LauncherApp[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_APPS_KEY);
      return raw ? (JSON.parse(raw) as LauncherApp[]) : [];
    } catch {
      return [];
    }
  });

  const [homeWallpaper, setHomeWallpaper] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(HOME_WP_KEY) ?? LAUNCHER_WALLPAPERS[0].src
      );
    } catch {
      return LAUNCHER_WALLPAPERS[0].src;
    }
  });

  const [lockWallpaper, setLockWallpaper] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(LOCK_WP_KEY) ?? LAUNCHER_WALLPAPERS[1].src
      );
    } catch {
      return LAUNCHER_WALLPAPERS[1].src;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadSsoAdminServices = useCallback(async () => {
    try {
      const res = await fetch('/auth/services', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { services?: AuthServiceRow[] };
      const rows = Array.isArray(data.services) ? data.services : [];
      const dynamicApps: LauncherApp[] = rows
        .filter((s) => s.enabled !== false && s.href)
        .map((s, idx) => ({
          id: `sso-admin-${s.slug}`,
          name: s.title || s.slug,
          subtitle: s.description || 'Admin Service',
          category: 'admin',
          iconName: 'ShieldCheck',
          gradient: ADMIN_GRADIENTS[idx % ADMIN_GRADIENTS.length],
          url: s.href.startsWith('http')
            ? s.href
            : `https://hd2lab.duckdns.org${s.href}`,
          adminOnly: true,
        }));

      const mergedAdmin = [
        ...CORE_ADMIN_APPS,
        ...dynamicApps,
        ADMIN_ADD_APP,
      ];
      setAdminServices(mergedAdmin);
    } catch {
      setAdminServices([...CORE_ADMIN_APPS, ADMIN_ADD_APP]);
    }
  }, []);

  // Check SSO session on mount
  useEffect(() => {
    fetch('/auth/session', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated === true) {
          setSsoAuthenticated(true);
          loadSsoAdminServices();
        }
      })
      .catch(() => {
        // Not authenticated or offline
      });
  }, [loadSsoAdminServices]);

  const catalogRequest = useRef<AbortController>(null);
  const refreshCatalogs = useCallback(() => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    const load = async <T,>(url: string, parse: (data: T) => LauncherApp[], apply: (apps: LauncherApp[]) => void) => {
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const apps = parse(await response.json());
        if (!controller.signal.aborted) apply(apps);
      } catch {
        // Keep the last successfully loaded catalog.
      }
    };
    void load(import.meta.env.BASE_URL + 'data/web-hq-apps.json', readWebCatalog, setWebHqApps);
    void load('/api/v1/manifests/service', (data: Parameters<typeof readServerCatalog>[0]) => readServerCatalog(data, 'service'), setServerApps);
    void load('/api/v1/manifests/ai', (data: Parameters<typeof readServerCatalog>[0]) => readServerCatalog(data, 'ai'), setAiApps);
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshCatalogs();
    };
    refreshCatalogs();
    window.addEventListener('focus', refreshCatalogs);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshCatalogs);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      catalogRequest.current?.abort();
    };
  }, [refreshCatalogs]);

  const visibleApps = useMemo(() => {
    const base = [...mergeServerCatalog(serverApps, aiApps), ...webHqApps, ADMIN_GATE_APP, ...customApps];
    if (ssoAuthenticated && adminPagesOpen) {
      return [...base, ...adminServices];
    }
    return base;
  }, [serverApps, aiApps, webHqApps, customApps, ssoAuthenticated, adminPagesOpen, adminServices]);

  const appsById = useMemo(
    () => new Map(visibleApps.map((app) => [app.id, app])),
    [visibleApps],
  );

  const [slots, setSlots] = useState<(string | null)[]>(() => {
    try {
      const raw = localStorage.getItem(SLOTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as (string | null)[];
        if (Array.isArray(parsed) && parsed.length >= TOTAL_SLOTS && parsed.length % SLOTS_PER_PAGE === 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return buildInitialSlots();
  });

  useEffect(() => {
    setSlots((previous) => placeWebApps(previous, webHqApps.map((app) => app.id)));
  }, [webHqApps]);

  // Keep the administrator gate and the authenticated administrator pages populated.
  useEffect(() => {
    setSlots((prev) => {
      const next = [...prev];
      const existingIds = new Set(next.filter((id): id is string => id !== null));

      // Ensure Page 3 has ADMIN_GATE_APP at bottom-right (slot 59) if not placed anywhere
      if (!existingIds.has(ADMIN_GATE_APP.id)) {
        const p3BottomRight = SLOTS_PER_PAGE * 3 - 1;
        if (next[p3BottomRight] === null) {
          next[p3BottomRight] = ADMIN_GATE_APP.id;
          existingIds.add(ADMIN_GATE_APP.id);
        } else {
          const p3Empty = next.findIndex(
            (id, idx) =>
              idx >= SLOTS_PER_PAGE * 2 &&
              idx < SLOTS_PER_PAGE * 3 &&
              id === null,
          );
          if (p3Empty !== -1) {
            next[p3Empty] = ADMIN_GATE_APP.id;
            existingIds.add(ADMIN_GATE_APP.id);
          }
        }
      }

      // Pages 4 & 5 (slots 60..99): Admin services sequentially from top
      if (ssoAuthenticated && adminPagesOpen) {
        for (const app of adminServices) {
          if (!existingIds.has(app.id)) {
            const p45Empty = next.findIndex(
              (id, idx) => idx >= ADMIN_START && idx < TOTAL_SLOTS && id === null,
            );
            if (p45Empty !== -1) {
              next[p45Empty] = app.id;
              existingIds.add(app.id);
            }
          }
        }
      }

      return next;
    });
  }, [ssoAuthenticated, adminPagesOpen, adminServices]);

  const pageStarts = useMemo(
    () => getPageStarts(slots.length, ssoAuthenticated && adminPagesOpen),
    [slots.length, ssoAuthenticated, adminPagesOpen],
  );
  const [currentPageStart, setCurrentPageStart] = useState<number | null>(null);
  const currentPage = currentPageStart === null ? 0 : pageStarts.indexOf(currentPageStart) + 1;
  const [editMode, setEditMode] = useState(false);
  const [activeApp, setActiveApp] = useState<LauncherApp | null>(null);
  const serviceViewportRef = useRef<ServiceViewportHandle>(null);
  const backExitGuardRef = useRef(new DoubleBackExitGuard(2000));
  const [isAppListOpen, setIsAppListOpen] = useState(false);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isChairmanLoginOpen, setIsChairmanLoginOpen] = useState(false);

  // Global pinch-zoom & multi-touch locking outside per-service viewports
  useEffect(() => {
    const preventGesture = (e: Event) => {
      if (!activeApp?.allowZoom) {
        e.preventDefault();
      }
    };
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1 && !activeApp?.allowZoom) {
        e.preventDefault();
      }
    };

    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('touchmove', preventPinch, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('touchmove', preventPinch);
    };
  }, [activeApp]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(customApps));
    } catch {
      // ignore
    }
  }, [customApps]);

  useEffect(() => {
    try {
      localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // ignore
    }
  }, [slots]);

  useEffect(() => {
    try {
      localStorage.setItem(HOME_WP_KEY, homeWallpaper);
    } catch {
      // ignore
    }
  }, [homeWallpaper]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCK_WP_KEY, lockWallpaper);
    } catch {
      // ignore
    }
  }, [lockWallpaper]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2400);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const handleUnlock = () => {
    setEditMode(false);
    setCurrentPageStart(null);
    setIsLocked(false);
  };

  const handleChangePage = (page: number) => {
    if (page === 0) setEditMode(false);
    setCurrentPageStart(page === 0 ? null : pageStarts[page - 1] ?? null);
  };

  const handleMoveSlot = (fromSlot: number, toSlot: number) => {
    setSlots((prev) => {
      const next = [...prev];
      const fromApp = next[fromSlot];
      const toApp = next[toSlot];
      next[toSlot] = fromApp;
      next[fromSlot] = toApp;
      return next;
    });
  };

  const handleOpenAdminGate = async () => {
    try {
      const res = await fetch('/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = res.ok ? await res.json() : null;
      if (data && data.authenticated === true) {
        setSsoAuthenticated(true);
        await loadSsoAdminServices();
        setAdminPagesOpen(true);
        setCurrentPageStart(ADMIN_START);
        setToastMessage('SSO 인증 확인 · 관리자 앱 페이지가 열렸습니다.');
        return;
      }
    } catch {
      // Fall through to SSO login redirect
    }

    // Open Chairman account login modal directly (no Google login)
    setIsChairmanLoginOpen(true);
  };

  const handleLaunchApp = (app: LauncherApp) => {
    backExitGuardRef.current.reset();
    setIsAppListOpen(false);
    setIsWallpaperOpen(false);
    if (isMusicApp(app.url)) {
      setActiveApp(null);
      music.open();
      return;
    }
    music.stop();

    if (app.internalView === 'admin-sso') {
      handleOpenAdminGate();
      return;
    }
    if (app.internalView === 'add-app') {
      setIsAddAppOpen(true);
      return;
    }
    if (app.openExternal && app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      setToastMessage(`${app.name} — 새 탭에서 열었습니다.`);
      return;
    }
    setActiveApp(app);
  };

  const confirmAppExit = (onExit: () => void) => {
    if (backExitGuardRef.current.attemptExit()) {
      setToastMessage(null);
      onExit();
      return;
    }
    setToastMessage('한 번 더 누르면 앱을 닫습니다');
  };

  const handleNavBack = () => {
    if (music.visible) {
      if (music.goBack()) {
        backExitGuardRef.current.reset();
        return;
      }
      confirmAppExit(() => music.stop());
      return;
    }
    if (isWallpaperOpen) {
      backExitGuardRef.current.reset();
      setIsWallpaperOpen(false);
      return;
    }
    if (isAppListOpen) {
      backExitGuardRef.current.reset();
      setIsAppListOpen(false);
      return;
    }
    if (activeApp) {
      if (activeApp.internalView) {
        backExitGuardRef.current.reset();
        setActiveApp(null);
        return;
      }
      if (serviceViewportRef.current?.goBack()) {
        backExitGuardRef.current.reset();
        return;
      }
      confirmAppExit(() => setActiveApp(null));
      return;
    }
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (currentPage > 0) {
      handleChangePage(currentPage - 1);
      return;
    }
    music.stop();
    setIsLocked(true);
  };

  const handleNavHome = () => {
    backExitGuardRef.current.reset();
    music.stop();
    setIsWallpaperOpen(false);
    setIsAppListOpen(false);
    setActiveApp(null);
    setEditMode(false);
    setCurrentPageStart(null);
  };

  const displaySlots = useMemo(
    () => slots.map((id) => (id && appsById.has(id) ? id : null)),
    [slots, appsById],
  );

  const handleAddCustomApp = (newApp: LauncherApp) => {
    setCustomApps((prev) => [...prev, newApp]);
    setSlots((prev) => {
      const next = [...prev];
      const pageStart = currentPageStart ?? 0;
      const localEmpty = next
        .slice(pageStart, pageStart + SLOTS_PER_PAGE)
        .findIndex((s) => s === null);
      if (localEmpty !== -1) {
        next[pageStart + localEmpty] = newApp.id;
      } else {
        const globalEmpty = next.findIndex((s, index) => index < TOTAL_SLOTS && s === null);
        if (globalEmpty !== -1) next[globalEmpty] = newApp.id;
      }
      return next;
    });
    setToastMessage(`"${newApp.name}" 서비스가 추가되었습니다.`);
  };

  const pinnedIds = useMemo(() => new Set(slots.filter((id): id is string => id !== null)), [slots]);

  const handlePinApp = (app: LauncherApp) => {
    if (pinnedIds.has(app.id) || app.adminOnly) return;
    const isWeb = app.category === 'web-hq' || app.category === 'game';
    const first = (isWeb ? 1 : 0) * SLOTS_PER_PAGE;
    const slot = slots.findIndex((id, i) => id === null && i >= first && i < first + SLOTS_PER_PAGE);
    const available = slot === -1 ? slots.findIndex((id, i) => id === null && i < 3 * SLOTS_PER_PAGE) : slot;
    if (available === -1) {
      setToastMessage('홈에 빈자리가 없습니다.');
      return;
    }
    setSlots((previous) => previous.map((id, index) => index === available ? app.id : id));
    setToastMessage(`"${app.name}" 앱을 홈에 추가했습니다.`);
  };

  const activeWallpaper = isAdminPage(currentPageStart) ? ADMIN_WALLPAPER_SRC : homeWallpaper;

  if (isDesktop) {
    return (
      <>
        <DesktopLauncher
          isLocked={isLocked}
          onUnlock={handleUnlock}
          onLock={() => { music.stop(); setIsLocked(true); }}
          apps={visibleApps}
          pinnedIds={pinnedIds}
          onPinApp={handlePinApp}
          onOpenCatalog={refreshCatalogs}
          appsById={appsById}
          slots={displaySlots}
          pageStarts={pageStarts}
          currentPage={currentPage}
          editMode={editMode}
          onChangePage={handleChangePage}
          onEnterEditMode={() => setEditMode(true)}
          onExitEditMode={() => setEditMode(false)}
          onMoveSlot={handleMoveSlot}
          onRemoveCustomApp={(id) => {
            setCustomApps((prev) => prev.filter((a) => a.id !== id));
            setSlots((prev) => prev.map((s) => (s === id ? null : s)));
            setToastMessage('커스텀 서비스가 삭제되었습니다.');
          }}
          onOpenAdminGate={handleOpenAdminGate}
          onOpenAddApp={() => setIsAddAppOpen(true)}
          onServicesUpdated={loadSsoAdminServices}
        />
        <AddAppModal
          isOpen={isAddAppOpen}
          onClose={() => setIsAddAppOpen(false)}
          onAddApp={handleAddCustomApp}
        />
        <ChairmanLoginModal
          isOpen={isChairmanLoginOpen}
          onClose={() => setIsChairmanLoginOpen(false)}
          onSuccess={async () => {
            setIsChairmanLoginOpen(false);
            setSsoAuthenticated(true);
            await loadSsoAdminServices();
            setAdminPagesOpen(true);
            setCurrentPageStart(ADMIN_START);
            setToastMessage('Chairman 인증 완료 · 관리자 앱 페이지가 열렸습니다.');
          }}
        />
        {toastMessage && (
          <div className="pointer-events-none fixed top-11 right-4 z-50 rounded-xl border border-white/15 bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`launcher-mobile-shell fixed top-0 right-0 left-0 flex w-full flex-col overflow-hidden bg-slate-950 text-white${isLocked ? '' : ' launcher-safe-area'}`}
    >
      <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950 text-white">
        {isLocked ? (
          <LockScreen
            wallpaperSrc={lockWallpaper}
            onUnlock={handleUnlock}
          />
        ) : (
          <>
            {/* Main Viewport Area (above persistent PhoneNavBar) */}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Home / Admin Wallpaper */}
              <img
                src={activeWallpaper}
                alt="홈 배경화면"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/50" />

              {/* Paged Home Grid */}
              <PagedAppGrid
                appsById={appsById}
                slots={displaySlots}
                pageStarts={pageStarts}
                currentPage={currentPage}
                editMode={editMode}
                widgetHome={<WidgetHome
                  active={currentPage === 0 && !activeApp && !music.visible && !isAppListOpen && !isWallpaperOpen}
                  onOpenLog={() => {
                    const log = appsById.get('update-log');
                    if (log) handleLaunchApp(log);
                  }}
                  onOpenApps={() => handleChangePage(1)}
                  onOpenMoments={() => handleLaunchApp(MOMENTS_APP)}
                />}
                onChangePage={handleChangePage}
                onEnterEditMode={() => setEditMode(true)}
                onExitEditMode={() => setEditMode(false)}
                onMoveSlot={handleMoveSlot}
                onLaunchApp={handleLaunchApp}
                onRemoveCustomApp={(id) => {
                  setCustomApps((prev) => prev.filter((a) => a.id !== id));
                  setSlots((prev) => prev.map((s) => (s === id ? null : s)));
                  setToastMessage('커스텀 서비스가 삭제되었습니다.');
                }}
                onOpenWallpaperPicker={() => setIsWallpaperOpen(true)}
              />

              {/* Internal Views or Service Viewport */}
              {activeApp?.internalView === 'update-log' ? (
                <UpdateLogView />
              ) : activeApp?.internalView === 'admin-services' ? (
                <AdminServicesView onServicesUpdated={loadSsoAdminServices} />
              ) : (
                activeApp && <ServiceViewport key={activeApp.id} app={activeApp} ref={serviceViewportRef} />
              )}

              <MusicPlayerSurface />

              {/* App List Drawer */}
              <AppListDrawer
                isOpen={isAppListOpen}
                apps={visibleApps}
                pinnedIds={pinnedIds}
                onPinApp={handlePinApp}
                adminMode={ssoAuthenticated && adminPagesOpen}
                onClose={() => setIsAppListOpen(false)}
                onLaunchApp={handleLaunchApp}
                onOpenAddApp={() => setIsAddAppOpen(true)}
                onOpenWallpaperPicker={() => setIsWallpaperOpen(true)}
                onLockScreen={() => {
                  music.stop();
                  setActiveApp(null);
                  setIsAppListOpen(false);
                  setIsWallpaperOpen(false);
                  setIsLocked(true);
                }}
              />

              {/* Wallpaper Picker Sheet */}
              <WallpaperModal
                isOpen={isWallpaperOpen}
                homeWallpaper={homeWallpaper}
                lockWallpaper={lockWallpaper}
                onSelectHomeWallpaper={(src) => {
                  setHomeWallpaper(src);
                  setToastMessage('홈 배경화면이 변경되었습니다.');
                }}
                onSelectLockWallpaper={(src) => {
                  setLockWallpaper(src);
                  setToastMessage('잠금 배경화면이 변경되었습니다.');
                }}
                onClose={() => setIsWallpaperOpen(false)}
              />
            </div>

            {/* Persistent Bottom Navigation Bar */}
            <PhoneNavBar
              isAppListOpen={isAppListOpen}
              onBack={handleNavBack}
              onHome={handleNavHome}
              onToggleAppList={() => {
                music.stop();
                setIsWallpaperOpen(false);
                if (!isAppListOpen) refreshCatalogs();
                setIsAppListOpen(!isAppListOpen);
              }}
            />
          </>
        )}

        {/* Toast */}
        {toastMessage && (
          <div className="pointer-events-none absolute top-5 right-4 left-4 z-50 flex justify-center">
            <div className="rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
              {toastMessage}
            </div>
          </div>
        )}
      </div>

      <AddAppModal
        isOpen={isAddAppOpen}
        onClose={() => setIsAddAppOpen(false)}
        onAddApp={handleAddCustomApp}
      />
      <ChairmanLoginModal
        isOpen={isChairmanLoginOpen}
        onClose={() => setIsChairmanLoginOpen(false)}
        onSuccess={async () => {
          setIsChairmanLoginOpen(false);
          setSsoAuthenticated(true);
          await loadSsoAdminServices();
          setAdminPagesOpen(true);
          setCurrentPageStart(ADMIN_START);
          setToastMessage('Chairman 인증 완료 · 관리자 앱 페이지가 열렸습니다.');
        }}
      />
    </div>
  );
}

export function App() {
  return <MusicPlayerProvider><Launcher /></MusicPlayerProvider>;
}

export default App;
