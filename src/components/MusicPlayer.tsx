import { Music2, Play } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ServiceTopBar } from './ServiceTopBar';

const MUSIC_PATH = '/hd2music/';
const DEFAULT_COVER = MUSIC_PATH + 'favicon.svg';
const MUSIC_APP = {
  name: 'HD2Music',
  url: MUSIC_PATH,
  iconName: 'Music2',
  gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
};

type Track = { title: string | null; artist: string; artwork: string | null };
type MusicWindow = Window & { hd2MusicControls?: { stop: () => void } };
type MusicContext = {
  track: Track | null;
  frame: RefObject<HTMLIFrameElement | null>;
  visible: boolean;
  open: () => void;
  stop: () => void;
};
const Context = createContext<MusicContext | null>(null);

export function isMusicApp(url: string) {
  try {
    const resolved = new URL(url, location.origin);
    return resolved.origin === location.origin && resolved.pathname.replace(/\/$/, '') === '/hd2music';
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
  return /^\/hd2music\/api\/v1\/tracks\/[a-f0-9]{24}\/cover$/.test(value) ? value : null;
}

function stopPlayback(frame: HTMLIFrameElement | null) {
  try {
    (frame?.contentWindow as MusicWindow | null)?.hd2MusicControls?.stop();
  } catch {
    // Removing the frame also stops playback if its document is no longer reachable.
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [visible, setVisible] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setVisible(true);
  }, []);

  const stop = useCallback(() => {
    stopPlayback(frame.current);
    setVisible(false);
    opener.current?.focus();
    opener.current = null;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const receive = (event: MessageEvent) => {
      const message = event.data;
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || message?.type !== 'hd2music:state') return;
      const title = typeof message.title === 'string' ? message.title : null;
      const artist = typeof message.artist === 'string' ? message.artist : '';
      const artwork = cover(message.artwork);
      setTrack((previous) => previous && previous.title === title && previous.artist === artist && previous.artwork === artwork
        ? previous
        : { title, artist, artwork });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [visible]);

  return <Context.Provider value={{ track, frame, visible, open, stop }}>{children}</Context.Provider>;
}

export function MusicPlayerSurface({ desktop = false }: { desktop?: boolean }) {
  const { visible, frame, stop } = useMusicLauncher();
  const [reloadSeq, setReloadSeq] = useState(0);
  const surface = useRef<HTMLElement>(null);
  useEffect(() => {
    if (visible) surface.current?.focus({ preventScroll: true });
  }, [visible]);

  if (!visible) return null;
  return (
    <section ref={surface} tabIndex={-1} aria-label="HD2Music 플레이어"
      className="absolute inset-0 z-[25] flex flex-col bg-slate-950 text-white md:z-40">
      <ServiceTopBar app={MUSIC_APP} onClose={desktop ? stop : undefined} onReload={() => {
        stopPlayback(frame.current);
        setReloadSeq((sequence) => sequence + 1);
      }} />
      <iframe key={reloadSeq} ref={frame} title="HD2Music" src={MUSIC_PATH + '?embed=launcher'}
        className="min-h-0 w-full flex-1 border-0" allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" />
    </section>
  );
}

export function MusicWidget() {
  const { track, open } = useMusicLauncher();
  return (
    <button type="button" onClick={open} aria-label="HD2Music 전체 플레이어 열기"
      className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-white/10">
      <img src={track?.artwork ?? DEFAULT_COVER} alt="" className="size-11 rounded-md bg-slate-800 object-cover"
        onError={(event) => { if (event.currentTarget.getAttribute('src') !== DEFAULT_COVER) event.currentTarget.src = DEFAULT_COVER; }} />
      <span className="min-w-0 flex-1 text-xs">
        <span className="flex items-center gap-1.5 text-slate-300"><Music2 className="size-3" aria-hidden /> HD2Music</span>
        <strong className="block truncate">{track?.title || '음악 보관함'}</strong>
        {track?.artist && <span className="block truncate text-slate-300">{track.artist}</span>}
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10"><Play className="size-4" aria-hidden /></span>
    </button>
  );
}
