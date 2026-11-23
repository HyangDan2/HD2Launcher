import { Music2, Pause, Play } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { attachSameOriginHistoryListeners, IframeHistoryTracker, type FrameWindowLike } from '../data/iframeHistory';
import { ServiceTopBar } from './ServiceTopBar';

const MUSIC_PATH = '/sona/';
const DEFAULT_COVER = MUSIC_PATH + 'favicon.svg';
const MUSIC_APP = {
  name: 'SONA',
  url: MUSIC_PATH,
  iconName: 'Music2',
  gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
};

type Track = { title: string | null; artist: string; artwork: string | null };
type MusicWindow = Window & { hd2MusicControls?: { toggle?: () => void; stop: () => void } };
type MusicContext = {
  track: Track | null;
  playing: boolean;
  mounted: boolean;
  frame: RefObject<HTMLIFrameElement | null>;
  visible: boolean;
  open: () => void;
  minimize: () => void;
  toggle: () => void;
  pauseForApp: () => void;
  resumeAfterApp: () => void;
  stop: () => void;
  goBack: () => boolean;
  onFrameLoad: () => void;
  resetHistory: () => void;
};
const Context = createContext<MusicContext | null>(null);

export function isMusicApp(url: string) {
  try {
    const resolved = new URL(url, location.origin);
    const normalized = resolved.pathname.replace(/\/$/, '');
    return resolved.origin === location.origin && (normalized === '/sona' || normalized === '/hd2music');
  } catch { return false; }
}

export function useMusicLauncher() {
  const controls = useContext(Context);
  if (!controls) throw new Error('Missing Launcher music provider');
  return controls;
}

function cover(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/=]+$/i.test(value) && value.length <= 330000) return value;
  if (/^\/(sona|hd2music)\/api\/v1\/tracks\/[a-f0-9]{24}\/cover$/.test(value)) {
    return `${value}?w=160`;
  }
  return null;
}

function stopPlayback(frame: HTMLIFrameElement | null) {
  try {
    (frame?.contentWindow as MusicWindow | null)?.hd2MusicControls?.stop();
  } catch {
    // Removing the frame also stops playback if its document is no longer reachable.
  }
}

function togglePlayback(frame: HTMLIFrameElement | null): boolean {
  try {
    const fn = (frame?.contentWindow as MusicWindow | null)?.hd2MusicControls?.toggle;
    if (typeof fn === 'function') {
      fn();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const trackerRef = useRef(new IframeHistoryTracker());
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const playingRef = useRef(false);
  const mountedRef = useRef(false);
  const pausedByAppRef = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  const open = useCallback(() => {
    trackerRef.current.reset();
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pausedByAppRef.current = false;
    setMounted(true);
    setVisible(true);
  }, []);

  const minimize = useCallback(() => {
    trackerRef.current.reset();
    setVisible(false);
  }, []);

  const toggle = useCallback(() => {
    pausedByAppRef.current = false;
    if (mountedRef.current && togglePlayback(frame.current)) return;
    open();
  }, [open]);

  const pauseForApp = useCallback(() => {
    if (!mountedRef.current || !playingRef.current) return;
    if (togglePlayback(frame.current)) {
      pausedByAppRef.current = true;
    }
  }, []);

  const resumeAfterApp = useCallback(() => {
    if (!mountedRef.current || !pausedByAppRef.current) return;
    pausedByAppRef.current = false;
    if (!playingRef.current) {
      togglePlayback(frame.current);
    }
  }, []);

  const stop = useCallback(() => {
    trackerRef.current.reset();
    pausedByAppRef.current = false;
    stopPlayback(frame.current);
    setPlaying(false);
    setVisible(false);
    setMounted(false);
    opener.current?.focus();
    opener.current = null;
  }, []);

  const resetHistory = useCallback(() => {
    trackerRef.current.reset();
  }, []);

  const onFrameLoad = useCallback(() => {
    trackerRef.current.onLoadCleared();
    const win = frame.current?.contentWindow as FrameWindowLike | null | undefined;
    if (!win) return;
    try {
      const href = win.location.href;
      trackerRef.current.recordSameOriginUrl(href);
      attachSameOriginHistoryListeners(win, trackerRef.current);
    } catch {
      trackerRef.current.recordCrossOriginLoad();
    }
  }, []);

  const goBack = useCallback(() => {
    const win = frame.current?.contentWindow as FrameWindowLike | null | undefined;
    return trackerRef.current.goBack(win, window);
  }, []);

  // Preload first recommended track from /sona/api/v1/catalog for the Home widget
  useEffect(() => {
    const controller = new AbortController();
    fetch('/sona/api/v1/catalog', { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const first = Array.isArray(data?.recommended) ? data.recommended[0] : null;
        if (!first || controller.signal.aborted) return;
        const title = typeof first.title === 'string' ? first.title : null;
        const artist = typeof first.artist === 'string' ? first.artist : '';
        const artwork = cover(first.cover);
        setTrack((previous) => previous ?? { title, artist, artwork });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Keep listening while mounted so background playback updates the Home widget in real time.
  useEffect(() => {
    if (!mounted) return;
    const receive = (event: MessageEvent) => {
      const message = event.data;
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || message?.type !== 'hd2music:state') return;
      const title = typeof message.title === 'string' ? message.title : null;
      const artist = typeof message.artist === 'string' ? message.artist : '';
      const artwork = cover(message.artwork);
      setPlaying(Boolean(message.playing));
      setTrack((previous) => previous && previous.title === title && previous.artist === artist && previous.artwork === artwork
        ? previous
        : { title, artist, artwork });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [mounted]);

  return (
    <Context.Provider
      value={{
        track,
        playing,
        mounted,
        frame,
        visible,
        open,
        minimize,
        toggle,
        pauseForApp,
        resumeAfterApp,
        stop,
        goBack,
        onFrameLoad,
        resetHistory,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function MusicPlayerSurface({ desktop = false }: { desktop?: boolean }) {
  const { mounted, visible, frame, stop, onFrameLoad, resetHistory } = useMusicLauncher();
  const [reloadSeq, setReloadSeq] = useState(0);
  const surface = useRef<HTMLElement>(null);
  useEffect(() => {
    if (visible) surface.current?.focus({ preventScroll: true });
  }, [visible]);

  if (!mounted) return null;
  return (
    <section
      ref={surface}
      tabIndex={-1}
      aria-label="SONA 플레이어"
      aria-hidden={!visible}
      className={
        visible
          ? 'absolute inset-0 z-[25] flex flex-col bg-slate-950 text-white md:z-40'
          : 'pointer-events-none invisible absolute inset-0 -z-10 flex flex-col bg-slate-950 text-white'
      }
    >
      <ServiceTopBar
        app={MUSIC_APP}
        onClose={desktop ? stop : undefined}
        onReload={() => {
          resetHistory();
          stopPlayback(frame.current);
          setReloadSeq((sequence) => sequence + 1);
        }}
      />
      <iframe
        key={reloadSeq}
        ref={frame}
        onLoad={onFrameLoad}
        title="SONA"
        src={MUSIC_PATH + '?embed=launcher'}
        className="min-h-0 w-full flex-1 border-0"
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      />
    </section>
  );
}

export function MusicWidget() {
  const { track, playing, mounted, open, toggle } = useMusicLauncher();
  return (
    <div className="flex w-full min-w-0 items-center gap-1.5 rounded-lg px-1 py-1">
      <button
        type="button"
        onClick={open}
        aria-label="SONA 전체 플레이어 열기"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left hover:bg-white/10"
      >
        <img
          src={track?.artwork ?? DEFAULT_COVER}
          alt=""
          className="size-11 shrink-0 rounded-md bg-slate-800 object-cover"
          onError={(event) => {
            if (event.currentTarget.getAttribute('src') !== DEFAULT_COVER) event.currentTarget.src = DEFAULT_COVER;
          }}
        />
        <span className="min-w-0 flex-1 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Music2 className="size-3" aria-hidden />
            <span>SONA</span>
            {playing && <span className="inline-block size-1.5 rounded-full bg-emerald-400" aria-label="재생 중" />}
          </span>
          <strong className="block truncate">{track?.title || '음악 보관함'}</strong>
          {track?.artist && <span className="block truncate text-slate-300">{track.artist}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-label={mounted ? (playing ? '일시정지' : '재생') : 'SONA 열기'}
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
