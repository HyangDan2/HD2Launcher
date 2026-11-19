import {
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { DesktopLockScreen } from './DesktopLockScreen';
import { DesktopSpotlight } from './DesktopSpotlight';
import { DesktopWindow, OpenWindowState } from './DesktopWindow';
import { IconGlyph } from './IconGlyph';
import { PagedAppGrid } from './PagedAppGrid';

const BASE = import.meta.env.BASE_URL;
const PC_HOME_WP = `${BASE}wallpapers/pc/homescreen.jpg`;
const PC_LOCK_WP = `${BASE}wallpapers/pc/lockscreen.jpg`;
const PC_ADMIN_WP = `${BASE}wallpapers/pc/admin-bg.png`;

interface DesktopLauncherProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  apps: LauncherApp[];
  appsById: Map<string, LauncherApp>;
  slots: (string | null)[];
  pageCount: number;
  currentPage: number;
  editMode: boolean;
  ssoAuthenticated: boolean;
  adminPagesOpen: boolean;
  onChangePage: (page: number) => void;
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onMoveSlot: (fromSlot: number, toSlot: number) => void;
  onRemoveCustomApp: (id: string) => void;
  onOpenAdminGate: () => void;
  onOpenAddApp: () => void;
  onServicesUpdated: () => void;
}

export function DesktopLauncher({
  isLocked,
  onUnlock,
  onLock,
  apps,
  appsById,
  slots,
  pageCount,
  currentPage,
  editMode,
  ssoAuthenticated,
  adminPagesOpen,
  onChangePage,
  onEnterEditMode,
  onExitEditMode,
  onMoveSlot,
  onRemoveCustomApp,
  onOpenAdminGate,
  onOpenAddApp,
  onServicesUpdated,
}: DesktopLauncherProps) {
  const [now, setNow] = useState(() => new Date());
  const [windows, setWindows] = useState<OpenWindowState[]>([]);
  const [topZ, setTopZ] = useState(30);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [pcHomeWp, setPcHomeWp] = useState(PC_HOME_WP);
  const [wpMenuOpen, setWpMenuOpen] = useState(false);
  const [dockPinnedOpen, setDockPinnedOpen] = useState(false);

  const wheelLockRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!isLocked) setSpotlightOpen((p) => !p);
      } else if (e.key === 'Escape') {
        setSpotlightOpen(false);
        setWpMenuOpen(false);
        setDockPinnedOpen(false);
      } else if (!isLocked && !spotlightOpen) {
        if (e.key === 'ArrowRight' && currentPage < pageCount - 1) {
          onChangePage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' && currentPage > 0) {
          onChangePage(currentPage - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLocked, spotlightOpen, currentPage, pageCount, onChangePage]);

  const handleLaunchApp = (app: LauncherApp) => {
    if (app.internalView === 'admin-sso') {
      onOpenAdminGate();
      return;
    }
    if (app.internalView === 'add-app') {
      onOpenAddApp();
      return;
    }
    if (app.openExternal && app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      setDockPinnedOpen(false);
      return;
    }

    setDockPinnedOpen(false);
    setWindows((prev) => {
      const existing = prev.find((w) => w.app.id === app.id);
      const nextZ = topZ + 1;
      setTopZ(nextZ);

      if (existing) {
        return prev.map((w) =>
          w.app.id === app.id
            ? { ...w, minimized: false, zIndex: nextZ }
            : w,
        );
      }

      const offset = (prev.length % 4) * 24;
      return [
        ...prev,
        {
          app,
          minimized: false,
          maximized: true,
          zIndex: nextZ,
          x: 140 + offset,
          y: 52 + offset,
        },
      ];
    });
  };

  const handleWheelPageFlip = (e: React.WheelEvent<HTMLDivElement>) => {
    if (windows.some((w) => !w.minimized)) return;
    const nowMs = Date.now();
    if (nowMs - wheelLockRef.current < 340) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta > 32 && currentPage < pageCount - 1) {
      wheelLockRef.current = nowMs;
      onChangePage(currentPage + 1);
    } else if (delta < -32 && currentPage > 0) {
      wheelLockRef.current = nowMs;
      onChangePage(currentPage - 1);
    }
  };

  const dockPinnedIds = [
    'server-hq',
    'hd2-ai',
    'webhq-main',
    'update-log',
    'admin-sso-gate',
  ];

  const dockApps = useMemo(() => {
    const pinned = dockPinnedIds
      .map((id) => appsById.get(id))
      .filter((a): a is LauncherApp => Boolean(a));
    const openExtras = windows
      .map((w) => w.app)
      .filter((a) => !dockPinnedIds.includes(a.id));
    return [...pinned, ...openExtras];
  }, [appsById, windows]);

  if (isLocked) {
    return <DesktopLockScreen wallpaperSrc={PC_LOCK_WP} onUnlock={onUnlock} />;
  }

  const timeString = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateString = now.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  const activeWallpaper = currentPage >= 3 ? PC_ADMIN_WP : pcHomeWp;
  const hasVisibleWindow = windows.some((w) => !w.minimized);
  const showRightDock = !hasVisibleWindow || dockPinnedOpen;

  const spaceTabs = [
    { page: 0, label: '1P Server-HQ' },
    { page: 1, label: '2P Web-HQ' },
    { page: 2, label: '3P Admin' },
    ...(ssoAuthenticated && adminPagesOpen
      ? [
          { page: 3, label: '4P Admin 1' },
          { page: 4, label: '5P Admin 2' },
        ]
      : []),
  ];

  return (
    <div
      onWheel={handleWheelPageFlip}
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white select-none"
    >
      {/* 16:9 PC Wallpaper */}
      <img
        src={activeWallpaper}
        alt="PC 런처 배경"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/10 to-transparent" />

      {/* Top macOS Menu Bar */}
      <header className="relative z-40 flex h-8 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 text-xs backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-sky-400 to-indigo-600 text-[9px] font-bold">
              H
            </span>
            <span>HD2 Launcher</span>
          </div>

          <nav className="flex items-center gap-1" aria-label="스페이스 전환">
            {spaceTabs.map((tab) => (
              <button
                key={tab.page}
                type="button"
                onClick={() => onChangePage(tab.page)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                  currentPage === tab.page
                    ? 'bg-white/20 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSpotlightOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/15"
          >
            <Search className="h-3 w-3 text-slate-400" />
            <span>검색</span>
            <kbd className="rounded bg-white/10 px-1 font-mono text-[9px]">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => (editMode ? onExitEditMode() : onEnterEditMode())}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
              editMode
                ? 'bg-sky-500 text-white'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            {editMode ? (
              <>
                <Check className="h-3 w-3" />
                <span>완료</span>
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" />
                <span>편집</span>
              </>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setWpMenuOpen((p) => !p)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/10"
            >
              <ImageIcon className="h-3 w-3" />
              <span>배경</span>
            </button>

            {wpMenuOpen && (
              <div className="absolute top-7 right-0 z-50 w-44 rounded-xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {[
                  { label: '기본 홈 (설원)', src: PC_HOME_WP },
                  { label: '겨울밤 인사', src: PC_LOCK_WP },
                  { label: 'HD²LAB Beyond', src: PC_ADMIN_WP },
                ].map((opt) => (
                  <button
                    key={opt.src}
                    type="button"
                    onClick={() => {
                      setPcHomeWp(opt.src);
                      setWpMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                      pcHomeWp === opt.src
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {pcHomeWp === opt.src && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLock}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/10"
            title="화면 잠금"
          >
            <Lock className="h-3 w-3" />
          </button>

          <span className="border-l border-white/15 pl-2.5 text-[11px] font-medium tabular-nums text-white/90">
            {dateString} {timeString}
          </span>
        </div>
      </header>

      {/* Main Desktop Area (Left-aligned grid + crisp page arrows) */}
      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex h-full w-full max-w-[460px] items-center pl-4 pr-2 pt-2 pb-4">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => onChangePage(Math.max(0, currentPage - 1))}
            aria-label="이전 페이지"
            className="z-20 mr-1 flex h-9 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/45 text-white/80 backdrop-blur-md transition hover:bg-slate-950/80 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex h-full min-w-0 flex-1 flex-col">
            <PagedAppGrid
              appsById={appsById}
              slots={slots}
              pageCount={pageCount}
              currentPage={currentPage}
              editMode={editMode}
              onChangePage={onChangePage}
              onEnterEditMode={onEnterEditMode}
              onExitEditMode={onExitEditMode}
              onMoveSlot={onMoveSlot}
              onLaunchApp={handleLaunchApp}
              onRemoveCustomApp={onRemoveCustomApp}
              onOpenWallpaperPicker={() => setWpMenuOpen(true)}
            />
          </div>

          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() =>
              onChangePage(Math.min(pageCount - 1, currentPage + 1))
            }
            aria-label="다음 페이지"
            className="z-20 ml-1 flex h-9 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/45 text-white/80 backdrop-blur-md transition hover:bg-slate-950/80 hover:text-white disabled:opacity-20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Multi-Window Desktop App Windows (Full Viewport by default) */}
        {windows.map((win) => (
          <DesktopWindow
            key={win.app.id}
            win={win}
            onFocus={() => {
              const nextZ = topZ + 1;
              setTopZ(nextZ);
              setWindows((prev) =>
                prev.map((w) =>
                  w.app.id === win.app.id ? { ...w, zIndex: nextZ } : w,
                ),
              );
            }}
            onClose={() =>
              setWindows((prev) =>
                prev.filter((w) => w.app.id !== win.app.id),
              )
            }
            onMinimize={() =>
              setWindows((prev) =>
                prev.map((w) =>
                  w.app.id === win.app.id ? { ...w, minimized: true } : w,
                ),
              )
            }
            onToggleMaximize={() =>
              setWindows((prev) =>
                prev.map((w) =>
                  w.app.id === win.app.id
                    ? { ...w, maximized: !w.maximized }
                    : w,
                ),
              )
            }
            onMove={(x, y) =>
              setWindows((prev) =>
                prev.map((w) =>
                  w.app.id === win.app.id ? { ...w, x, y } : w,
                ),
              )
            }
            onServicesUpdated={onServicesUpdated}
          />
        ))}
      </main>

      {/* Right-side Vertical Dock (Auto-hides when an app window is open) */}
      <div
        className={`pointer-events-none fixed inset-y-0 right-3 z-40 flex items-center transition-all duration-250 ${
          showRightDock
            ? 'translate-x-0 opacity-100'
            : 'translate-x-24 opacity-0'
        }`}
      >
        <nav
          aria-label="우측 런처 Dock"
          className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-[22px] border border-white/20 bg-slate-900/70 px-2 py-3 shadow-2xl backdrop-blur-2xl"
        >
          {dockApps.map((app) => {
            const openWin = windows.find((w) => w.app.id === app.id);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleLaunchApp(app)}
                className="group relative flex items-center focus:outline-none"
                title={`${app.name} — ${app.subtitle}`}
              >
                <span className="pointer-events-none absolute right-14 rounded-lg border border-white/15 bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow transition group-hover:opacity-100">
                  {app.name}
                </span>

                <div
                  className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${app.gradient} text-white shadow-lg ring-1 ring-white/25 transition-all duration-150 group-hover:-translate-x-1 group-hover:scale-110 active:scale-95`}
                >
                  {app.thumbnailUrl ? (
                    <img
                      src={app.thumbnailUrl}
                      alt={app.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <IconGlyph name={app.iconName} className="h-5 w-5" />
                  )}
                </div>

                <span
                  className={`ml-1 h-1.5 w-1.5 rounded-full ${
                    openWin ? 'bg-white opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right-Middle Floating Launcher Toggle (avoids bottom-right theme toggles) */}
      {hasVisibleWindow && (
        <button
          type="button"
          onClick={() => setDockPinnedOpen((p) => !p)}
          className={`fixed top-1/2 z-50 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-white/25 bg-slate-900/85 text-white shadow-2xl backdrop-blur-xl transition-all hover:bg-slate-800 active:scale-95 ${
            dockPinnedOpen ? 'right-[76px]' : 'right-0'
          }`}
          title={dockPinnedOpen ? '런처 Dock 닫기' : '런처 Dock 열기'}
          aria-label="런처 Dock 토글"
        >
          {dockPinnedOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4 text-sky-300" />
          )}
        </button>
      )}

      <DesktopSpotlight
        isOpen={spotlightOpen}
        apps={apps}
        onClose={() => setSpotlightOpen(false)}
        onLaunchApp={handleLaunchApp}
      />
    </div>
  );
}
