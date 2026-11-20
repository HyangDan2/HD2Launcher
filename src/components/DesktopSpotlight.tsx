import { ArrowRight, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { IconGlyph } from './IconGlyph';

interface DesktopSpotlightProps {
  isOpen: boolean;
  apps: LauncherApp[];
  pinnedIds: ReadonlySet<string>;
  onPinApp: (app: LauncherApp) => void;
  onClose: () => void;
  onLaunchApp: (app: LauncherApp) => void;
}

export function DesktopSpotlight({
  isOpen,
  apps,
  pinnedIds,
  onPinApp,
  onClose,
  onLaunchApp,
}: DesktopSpotlightProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const matched = apps.filter(
    (a) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-3 w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-sky-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matched.length > 0) {
                onLaunchApp(matched[0]);
                onClose();
              }
            }}
            placeholder="Spotlight 검색 (Server-HQ, Web-HQ, Game, Admin...)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto p-2">
          {matched.map((app) => (
            <div key={app.id} className="flex items-center gap-2 rounded-xl pr-2">
              <button
                type="button"
                onClick={() => {
                  onLaunchApp(app);
                  onClose();
                }}
                className="flex min-w-0 flex-1 items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${app.gradient} text-white`}
                  >
                    {app.thumbnailUrl ? (
                      <img
                        src={app.thumbnailUrl}
                        alt={app.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <IconGlyph name={app.iconName} className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{app.name}</p>
                    <p className="text-[11px] text-slate-400">{app.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {!app.adminOnly && !app.internalView && !pinnedIds.has(app.id) && (
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/15 px-2 py-2 text-xs text-slate-100 hover:bg-white/10"
                  onClick={() => onPinApp(app)}
                  aria-label={`${app.name} 홈에 추가`}
                >
                  홈에 추가
                </button>
              )}
            </div>
          ))}

          {matched.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
