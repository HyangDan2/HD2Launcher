import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { IconGlyph } from './IconGlyph';

interface ServiceViewportProps {
  app: LauncherApp;
}

export function ServiceViewport({ app }: ServiceViewportProps) {
  const [reloadSeq, setReloadSeq] = useState(0);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950">
      {/* Compact Service Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/95 px-3">
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
            onClick={() => setReloadSeq((s) => s + 1)}
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
        </div>
      </div>

      {/* Main Viewport Area (서비스별 확대/스크롤 정책 적용) */}
      <div
        className="relative flex-1 overflow-auto bg-slate-950"
        style={{
          touchAction: app.allowZoom ? 'pan-x pan-y pinch-zoom' : 'pan-y',
        }}
      >
        <iframe
          key={`${app.id}-${reloadSeq}`}
          src={app.url}
          title={app.name}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />

        {/* Subtle notice for X-Frame-Options protected services */}
        <div className="pointer-events-none absolute right-2 bottom-2 left-2 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[10px] text-slate-300 backdrop-blur-md">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            <span>화면이 보이지 않으면 우측 상단 &ldquo;새 탭&rdquo;을 눌러주세요.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
