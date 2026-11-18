import {
  ExternalLink,
  Image as ImageIcon,
  Lock,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { IconGlyph } from './IconGlyph';

interface AppListDrawerProps {
  isOpen: boolean;
  apps: LauncherApp[];
  adminMode: boolean;
  onClose: () => void;
  onLaunchApp: (app: LauncherApp) => void;
  onOpenAddApp: () => void;
  onOpenWallpaperPicker: () => void;
  onLockScreen: () => void;
}

const CATEGORY_LABEL: Record<LauncherApp['category'], string> = {
  hq: 'HQ',
  'service-hub': 'Service Hub',
  'ai-hub': 'AI Hub',
  'web-hq': 'Web-HQ',
  game: 'Game',
  admin: 'Admin',
  custom: 'Custom',
};

export function AppListDrawer({
  isOpen,
  apps,
  adminMode,
  onClose,
  onLaunchApp,
  onOpenAddApp,
  onOpenWallpaperPicker,
  onLockScreen,
}: AppListDrawerProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const filtered = apps.filter(
    (app) =>
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.subtitle.toLowerCase().includes(q) ||
      CATEGORY_LABEL[app.category].toLowerCase().includes(q),
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-slate-950/92 backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-white">앱 리스트</h2>
          <p className="text-[11px] text-slate-400">
            Service Hub · AI Hub ({apps.length}개)
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallpaperPicker();
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
            title="배경화면 변경"
            aria-label="배경화면 변경"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLockScreen();
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
            title="화면 잠금"
            aria-label="화면 잠금"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="서비스 검색 (Market, HD2AI, Admin...)"
            className="w-full rounded-2xl border border-white/15 bg-white/5 py-2 pr-8 pl-8 text-xs text-white placeholder-slate-400 focus:border-sky-400/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* App List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {filtered.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => {
              onClose();
              onLaunchApp(app);
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${app.gradient} text-white shadow`}
              >
                <IconGlyph name={app.iconName} className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white">{app.name}</p>
                  {app.adminOnly && (
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{app.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                {CATEGORY_LABEL[app.category]}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </button>
        ))}

        {adminMode && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddApp();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-3 text-xs font-medium text-slate-300 transition hover:border-sky-400/60 hover:bg-sky-500/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            <span>관리자 커스텀 서비스 등록</span>
          </button>
        )}
      </div>
    </div>
  );
}
