import { embeddedAppUrl } from '../data/embed';
import {
  attachSameOriginHistoryListeners,
  IframeHistoryTracker,
  type FrameWindowLike,
} from '../data/iframeHistory';
import { ShieldAlert } from 'lucide-react';
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { LauncherApp } from '../types/launcher';
import { ServiceTopBar } from './ServiceTopBar';

export interface ServiceViewportHandle {
  goBack: () => boolean;
}

interface ServiceViewportProps {
  app: LauncherApp;
  ref?: Ref<ServiceViewportHandle>;
}

export function ServiceViewport({ app, ref }: ServiceViewportProps) {
  const [reloadSeq, setReloadSeq] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const trackerRef = useRef(new IframeHistoryTracker());

  useEffect(() => {
    trackerRef.current.reset();
  }, [app.id, reloadSeq]);

  const handleFrameLoad = () => {
    trackerRef.current.onLoadCleared();
    const win = frameRef.current?.contentWindow as
      | FrameWindowLike
      | null
      | undefined;
    if (!win) return;

    try {
      const href = win.location.href;
      trackerRef.current.recordSameOriginUrl(href);
      attachSameOriginHistoryListeners(win, trackerRef.current);
    } catch {
      trackerRef.current.recordCrossOriginLoad();
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      goBack() {
        const frameWindow = frameRef.current?.contentWindow as
          | FrameWindowLike
          | null
          | undefined;
        return trackerRef.current.goBack(frameWindow, window);
      },
    }),
    [],
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950">
      <ServiceTopBar app={app} onReload={() => setReloadSeq((s) => s + 1)} />

      {/* Main Viewport Area (서비스별 확대/스크롤 정책 적용) */}
      <div
        className="relative flex-1 overflow-auto bg-slate-950"
        style={{
          touchAction: app.allowZoom ? 'pan-x pan-y pinch-zoom' : 'pan-y',
        }}
      >
        <iframe
          ref={frameRef}
          onLoad={handleFrameLoad}
          key={`${app.id}-${reloadSeq}`}
          src={embeddedAppUrl(app.url)}
          title={app.name}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />

        {/* Subtle notice for X-Frame-Options protected services */}
        <div className="pointer-events-none absolute right-2 bottom-2 left-2 flex justify-center">
          <div className="pointer-events-none flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[10px] text-slate-300 backdrop-blur-md">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            <span>화면이 보이지 않으면 우측 상단 &ldquo;새 탭&rdquo;을 눌러주세요.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
