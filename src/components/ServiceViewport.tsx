import { ShieldAlert } from 'lucide-react';
import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { LauncherApp } from '../types/launcher';
import { ServiceTopBar } from './ServiceTopBar';

// The project's TypeScript DOM declarations predate the Navigation API.
type FrameWindow = Window & {
  navigation?: {
    canGoBack: boolean;
    back: () => { committed: Promise<unknown>; finished: Promise<unknown> };
  };
};

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
  const pendingBack = useRef<FrameWindow['navigation']>(undefined);

  useImperativeHandle(ref, () => ({
    goBack() {
      try {
        // Consult the iframe's own entries so Back cannot leave the launcher tab.
        const frameWindow = frameRef.current?.contentWindow as FrameWindow | null | undefined;
        const navigation = frameWindow?.navigation;
        if (!navigation) return false;
        if (pendingBack.current === navigation) return true;
        if (!navigation.canGoBack) return false;
        const { committed, finished } = navigation.back();
        pendingBack.current = navigation;
        void committed.catch(() => {}).finally(() => {
          if (pendingBack.current === navigation) pendingBack.current = undefined;
        });
        void finished.catch(() => {});
        return true;
      } catch {
        // Other origins cannot expose the iframe's history to the launcher.
        return false;
      }
    },
  }), []);

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
          onLoad={() => { pendingBack.current = undefined; }}
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
