import { embeddedAppUrl } from '../data/embed';
import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { AdminServicesView } from './AdminServicesView';
import { IconGlyph } from './IconGlyph';
import { UpdateLogView } from './UpdateLogView';

export interface OpenWindowState {
  app: LauncherApp;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  x: number;
  y: number;
}

interface DesktopWindowProps {
  win: OpenWindowState;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onServicesUpdated: () => void;
}

export function DesktopWindow({
  win,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onServicesUpdated,
}: DesktopWindowProps) {
  const [reloadSeq, setReloadSeq] = useState(0);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    winX: number;
    winY: number;
  } | null>(null);

  if (win.minimized) return null;

  const { app } = win;

  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    onFocus();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: win.x,
      winY: win.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || win.maximized) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    onMove(
      Math.max(12, dragStartRef.current.winX + dx),
      Math.max(36, dragStartRef.current.winY + dy),
    );
  };

  const handleTitlePointerUp = () => {
    dragStartRef.current = null;
  };

  return (
    <div
      onPointerDown={onFocus}
      style={
        win.maximized
          ? {
              zIndex: win.zIndex,
              left: 10,
              top: 40,
              right: 10,
              bottom: 10,
            }
          : {
              zIndex: win.zIndex,
              left: win.x,
              top: win.y,
              width: 'min(920px, calc(100vw - 48px))',
              height: 'min(620px, calc(100vh - 150px))',
            }
      }
      className="fixed flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950/95 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
    >
      {/* macOS Titlebar */}
      <div
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={onToggleMaximize}
        className="flex h-10 shrink-0 cursor-grab items-center justify-between border-b border-white/10 bg-white/[0.04] px-3.5 select-none active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="h-3 w-3 rounded-full bg-rose-500 transition hover:brightness-110"
              title="닫기"
              aria-label="닫기"
            />
            <button
              type="button"
              onClick={onMinimize}
              className="h-3 w-3 rounded-full bg-amber-400 transition hover:brightness-110"
              title="최소화"
              aria-label="최소화"
            />
            <button
              type="button"
              onClick={onToggleMaximize}
              className="h-3 w-3 rounded-full bg-emerald-400 transition hover:brightness-110"
              title="최대화"
              aria-label="최대화"
            />
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${app.gradient} text-white`}
            >
              <IconGlyph name={app.iconName} className="h-3 w-3" />
            </div>
            <span className="text-xs font-semibold text-white">{app.name}</span>
            {app.url && (
              <span className="hidden text-[11px] text-slate-400 sm:inline">
                {app.url}
              </span>
            )}
          </div>
        </div>

        {app.url && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReloadSeq((s) => s + 1)}
              className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              title="새로고침"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20"
            >
              <span>새 탭</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Window Content */}
      <div className="relative flex-1 overflow-hidden bg-slate-950">
        {app.internalView === 'update-log' ? (
          <UpdateLogView />
        ) : app.internalView === 'admin-services' ? (
          <AdminServicesView onServicesUpdated={onServicesUpdated} />
        ) : (
          <>
            <iframe
              key={`${app.id}-${reloadSeq}`}
              src={embeddedAppUrl(app.url)}
              title={app.name}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
            <div className="pointer-events-none absolute right-3 bottom-3 flex justify-end">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/85 px-3 py-1 text-[11px] text-slate-300 backdrop-blur-md">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <span>표시되지 않으면 우측 상단 &ldquo;새 탭&rdquo;을 눌러주세요.</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
