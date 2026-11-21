import { ArrowLeft, Music2, Pause, Play } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const MUSIC_PATH = '/hd2music/';
const DEFAULT_COVER = MUSIC_PATH + 'favicon.svg';

type MusicState = {
  title: string | null;
  artist: string;
  artwork: string | null;
  position: number;
  duration: number;
  playing: boolean;
  ready: boolean;
  loading: boolean;
};

type Controls = { toggle: () => void; stop: () => void };
type MusicContext = { state: MusicState | null; open: () => void; stop: () => void; toggle: () => void };
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

export function MusicPlayerProvider({children}: {children: ReactNode}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<MusicState | null>(null);
  const [visible, setVisible] = useState(false);
  const back = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const controls = useCallback(() => {
    try { return (iframe.current?.contentWindow as (Window & {hd2MusicControls?: Controls}) | null)?.hd2MusicControls; }
    catch { return undefined; }
  }, []);
  const close = useCallback(() => {
    setVisible(false);
    opener.current?.focus();
  }, []);
  const open = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setVisible(true);
  }, []);
  const stop = useCallback(() => { controls()?.stop(); setVisible(false); }, [controls]);
  const toggle = useCallback(() => { controls()?.toggle(); }, [controls]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const message = event.data;
      if (event.origin !== location.origin || event.source !== iframe.current?.contentWindow || message?.type !== 'hd2music:state') return;
      setState({
        title: typeof message.title === 'string' ? message.title : null,
        artist: typeof message.artist === 'string' ? message.artist : '',
        artwork: cover(message.artwork),
        position: Number.isFinite(message.position) ? Number(message.position) : 0,
        duration: Number.isFinite(message.duration) ? Number(message.duration) : 0,
        playing: message.playing === true,
        ready: message.ready === true,
        loading: message.loading === true,
      });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (visible) back.current?.focus();
  }, [visible]);

  return <Context.Provider value={{state, open, stop, toggle}}>
    {children}
    <section
      aria-label="HD2Music 플레이어"
      hidden={!visible}
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white"
    >
      <header className="flex shrink-0 items-center border-b border-white/15 px-3 py-1">
        <button ref={back} type="button" onClick={close} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-white/10">
          <ArrowLeft className="size-4" aria-hidden /> Launcher로 돌아가기
        </button>
      </header>
      <iframe ref={iframe} title="HD2Music" src={MUSIC_PATH + '?embed=launcher'}
        className="min-h-0 w-full flex-1 border-0" allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" />
    </section>
  </Context.Provider>;
}

function clock(total: number) {
  const seconds = Math.max(0, Math.floor(total));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function MusicWidget() {
  const {state, open, toggle} = useMusicLauncher();
  return <div className="flex items-stretch gap-1">
    <button type="button" onClick={open} aria-label="HD2Music 전체 플레이어 열기"
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-white/10">
      <img src={state?.artwork ?? DEFAULT_COVER} alt="" className="size-11 rounded-md bg-slate-800 object-cover"
        onError={(event) => { if (event.currentTarget.getAttribute('src') !== DEFAULT_COVER) event.currentTarget.src = DEFAULT_COVER; }} />
      <span className="min-w-0 flex-1 text-xs">
        <span className="flex items-center gap-1.5 text-slate-300"><Music2 className="size-3" aria-hidden /> HD2Music</span>
        <strong className="block truncate">{state?.title || '음악 보관함'}</strong>
        {state?.artist && <span className="block truncate text-slate-300">{state.artist}</span>}
        {!!state?.duration && <progress className="mt-1 h-1 w-full accent-violet-300" aria-label="재생 진행률"
          value={state.position} max={state.duration} />}
      </span>
      {!!state?.duration && <span className="self-center text-xs tabular-nums text-slate-300">{clock(state.position)}</span>}
    </button>
    <button type="button" disabled={!state?.ready || state.loading} onClick={toggle}
      aria-label={state?.playing ? '음악 일시정지' : '음악 재생'}
      className="grid min-h-11 min-w-11 place-items-center self-center rounded-lg hover:bg-white/15 disabled:opacity-40">
      {state?.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
    </button>
  </div>;
}
