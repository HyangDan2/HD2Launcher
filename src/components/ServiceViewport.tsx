import { broadcastLauncherViewport, embeddedAppUrl } from '../data/embed';
import {
  attachSameOriginHistoryListeners,
  IframeHistoryTracker,
  type FrameWindowLike,
} from '../data/iframeHistory';
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

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => broadcastLauncherViewport(frame));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [app.id, reloadSeq]);

  const handleFrameLoad = () => {
    trackerRef.current.onLoadCleared();
    broadcastLauncherViewport(frameRef.current);
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
      </div>
    </div>
  );
}
