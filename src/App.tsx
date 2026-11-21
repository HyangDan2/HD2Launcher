import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddAppModal } from './components/AddAppModal';
import { AdminServicesView } from './components/AdminServicesView';
import { AppListDrawer } from './components/AppListDrawer';
import { ChairmanLoginModal } from './components/ChairmanLoginModal';
import { DesktopLauncher } from './components/DesktopLauncher';
import { LockScreen } from './components/LockScreen';
import {
  PagedAppGrid,
  SLOTS_PER_PAGE,
  TOTAL_SLOTS,
} from './components/PagedAppGrid';
import { PhoneNavBar } from './components/PhoneNavBar';
import { ServiceViewport, type ServiceViewportHandle } from './components/ServiceViewport';
import { UpdateLogView } from './components/UpdateLogView';
import { WallpaperModal } from './components/WallpaperModal';
import { WidgetHome } from './components/WidgetHome';
import { mergeServerCatalog, readServerCatalog, readWebCatalog } from './data/catalog';
import {
  ADMIN_ADD_APP,
  ADMIN_GATE_APP,
  ADMIN_WALLPAPER_SRC,
  CORE_ADMIN_APPS,
  DEFAULT_SERVICES,
  LAUNCHER_WALLPAPERS,
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

// Preserve the existing Web-HQ defaults for new devices without auto-pinning future catalog entries.
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

export function App() {
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

  // Dynamically allocate viewport height for both mobile browser (Chrome/Safari) and Standalone PWA
  useEffect(() => {
    const updateAppHeight = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as { standalone?: boolean }).standalone);
      if (isStandalone) {
        document.documentElement.style.setProperty('--app-height', '100lvh');
      } else {
        const h = Math.round(
          window.visualViewport?.height ?? window.innerHeight,
        );
        document.documentElement.style.setProperty('--app-height', `${h}px`);
      }
    };

    updateAppHeight();
    window.addEventListener('resize', updateAppHeight);
    window.addEventListener('orientationchange', updateAppHeight);
    window.visualViewport?.addEventListener('resize', updateAppHeight);
    return () => {
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

  useEffect(() => {
    let request: AbortController;
    const refreshCatalogs = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
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
    };
    refreshCatalogs();
    window.addEventListener('focus', refreshCatalogs);
    return () => {
      window.removeEventListener('focus', refreshCatalogs);
      request?.abort();
    };
  }, []);

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
        if (Array.isArray(parsed) && parsed.length === TOTAL_SLOTS) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return buildInitialSlots();
  });

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
              (id, idx) => idx >= SLOTS_PER_PAGE * 3 && id === null,
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

  const [currentPage, setCurrentPage] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [activeApp, setActiveApp] = useState<LauncherApp | null>(null);
  const serviceViewportRef = useRef<ServiceViewportHandle>(null);
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
    setCurrentPage(0);
    setIsLocked(false);
  };

  const handleChangePage = (page: number) => {
    if (page === 0) setEditMode(false);
    setCurrentPage(page);
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
        setCurrentPage(4);
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
    setIsAppListOpen(false);
    setIsWallpaperOpen(false);

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

  const handleNavBack = () => {
    if (isWallpaperOpen) {
      setIsWallpaperOpen(false);
      return;
    }
    if (isAppListOpen) {
      setIsAppListOpen(false);
      return;
    }
    if (activeApp) {
      if (serviceViewportRef.current?.goBack()) return;
      setActiveApp(null);
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
    setIsLocked(true);
  };

  const handleNavHome = () => {
    setIsWallpaperOpen(false);
    setIsAppListOpen(false);
    setActiveApp(null);
    setEditMode(false);
    setCurrentPage(0);
  };

  const displaySlots = useMemo(
    () => slots.map((id) => (id && appsById.has(id) ? id : null)),
    [slots, appsById],
  );

  const handleAddCustomApp = (newApp: LauncherApp) => {
    setCustomApps((prev) => [...prev, newApp]);
    setSlots((prev) => {
      const next = [...prev];
      const pageStart = Math.max(0, currentPage - 1) * SLOTS_PER_PAGE;
      const localEmpty = next
        .slice(pageStart, pageStart + SLOTS_PER_PAGE)
        .findIndex((s) => s === null);
      if (localEmpty !== -1) {
        next[pageStart + localEmpty] = newApp.id;
      } else {
        const globalEmpty = next.findIndex((s) => s === null);
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

  const pageCount = ssoAuthenticated && adminPagesOpen ? 6 : 4;
  const activeWallpaper =
    currentPage >= 4 ? ADMIN_WALLPAPER_SRC : homeWallpaper;

  if (isDesktop) {
    return (
      <>
        <DesktopLauncher
          isLocked={isLocked}
          onUnlock={handleUnlock}
          onLock={() => setIsLocked(true)}
          apps={visibleApps}
          pinnedIds={pinnedIds}
          onPinApp={handlePinApp}
          appsById={appsById}
          slots={displaySlots}
          pageCount={pageCount}
          currentPage={currentPage}
          editMode={editMode}
          ssoAuthenticated={ssoAuthenticated}
          adminPagesOpen={adminPagesOpen}
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
            setCurrentPage(4);
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
      style={{ height: 'var(--app-height, 100dvh)' }}
      className="fixed top-0 right-0 left-0 flex w-full flex-col overflow-hidden bg-slate-950 text-white"
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
            <div className="relative flex flex-1 flex-col overflow-hidden">
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
                pageCount={pageCount}
                currentPage={currentPage}
                editMode={editMode}
                widgetHome={<WidgetHome
                  active={currentPage === 0 && !activeApp && !isAppListOpen && !isWallpaperOpen}
                  onOpenLog={() => {
                    const log = appsById.get('update-log');
                    if (log) handleLaunchApp(log);
                  }}
                  onOpenApps={() => handleChangePage(1)}
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
                setIsWallpaperOpen(false);
                setIsAppListOpen((prev) => !prev);
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
          setCurrentPage(4);
          setToastMessage('Chairman 인증 완료 · 관리자 앱 페이지가 열렸습니다.');
        }}
      />
    </div>
  );
}

export default App;
