import { ExternalLink, RefreshCw, X } from 'lucide-react';
import type { LauncherApp } from '../types/launcher';
import { IconGlyph } from './IconGlyph';

interface ServiceTopBarProps {
  app: Pick<LauncherApp, 'name' | 'url' | 'iconName' | 'gradient' | 'adminOnly'>;
  onReload: () => void;
  onClose?: () => void;
}

export function ServiceTopBar({ app, onReload, onClose }: ServiceTopBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/95 px-3 [@media(orientation:landscape)_and_(max-height:540px)]:h-9">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${app.gradient} text-white`}
        >
          <IconGlyph name={app.iconName} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-semibold text-white">
              {app.name}
            </p>
            {app.adminOnly && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                ADMIN
              </span>
            )}
          </div>
          <p className="truncate text-[10px] text-slate-400">{app.url}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          title="새로고침"
          aria-label="새로고침"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20"
          title="새 탭으로 열기"
        >
          <span>새 탭</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="플레이어 닫기"
            title="플레이어 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
