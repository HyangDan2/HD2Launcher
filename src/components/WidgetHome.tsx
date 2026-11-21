import { Activity, ChevronDown, ChevronRight, Images, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MusicWidget } from './MusicPlayer';
import type { PatchChange, PatchNote } from '../types/launcher';

const BASE = import.meta.env.BASE_URL;
const portrait = BASE + 'wallpapers/homescreen.jpg';
const winter = BASE + 'wallpapers/pc/homescreen.jpg';

const tile = 'min-w-0 rounded-2xl border border-white/20 bg-slate-950/85 p-3 text-white shadow-lg backdrop-blur-md';
const control = 'inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs text-slate-100 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-violet-300';
const heading = 'flex min-w-0 items-center gap-2 text-sm font-semibold';
const pending = 'shrink-0 text-[11px] text-violet-200';

export function WidgetHome({ active, onOpenLog, onOpenApps }: {
  active: boolean;
  onOpenLog: () => void;
  onOpenApps: () => void;
}) {
  const [changes, setChanges] = useState<PatchChange[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [loading, setLoading] = useState(true);
  const [gram, setGram] = useState<{ caption: string; image: string; alt: string } | null>(null);
  const [gramStatus, setGramStatus] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading');

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setGram(null);
    setGramStatus('loading');
    fetch('/gram/api/feed?account=hyangdan2&limit=1', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('GRAM unavailable');
        const data = await response.json();
        const post = Array.isArray(data.items) ? data.items[0] : null;
        if (!post?.media?.[0]?.thumbUrl) { setGram(null); setGramStatus('empty'); return; }
        setGram({ caption: String(post.caption || ''), image: String(post.media[0].thumbUrl), alt: String(post.media[0].alt || '') });
        setGramStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) { setGram(null); setGramStatus('error'); } });
    return () => controller.abort();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    fetch(BASE + 'data/patch-notes.json', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load patch notes');
        const notes: PatchNote[] = await response.json();
        if (controller.signal.aborted) return;
        setChanges(Array.isArray(notes) ? notes.flatMap((note) => note.changes ?? []) : []);
        setIndex(0);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [active]);

  useEffect(() => {
    if (!active || paused || changes.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % changes.length), 5000);
    return () => window.clearInterval(timer);
  }, [active, paused, changes.length]);

  const change = changes[index];

  return (
    <section aria-label="위젯 홈" className="flex min-h-0 flex-col overflow-y-auto overscroll-contain px-3 py-2 sm:px-4" onWheel={(event) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation();
    }}>
      <div className="my-auto grid w-full grid-cols-2 gap-2.5">
        <section className={tile + ' col-span-2'} aria-label="업데이트 티커">
          <div className="flex items-center justify-between gap-1">
            <h2 className={heading}><Activity className="size-4 shrink-0 text-violet-300" aria-hidden />업데이트 로그</h2>
            <button type="button" className={control + ' shrink-0'} onClick={onOpenLog}>전체 보기 ↗</button>
          </div>
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1 overflow-hidden">
              <div key={index} className="widget-ticker-entry flex items-center gap-2 py-1 text-xs">
                {change && <span className="shrink-0 rounded bg-violet-400/25 px-1.5 py-1 font-semibold text-violet-100">{change.type}</span>}
                <span className="truncate font-medium" title={change?.text}>{change?.text ?? (loading ? '업데이트를 불러오는 중…' : '표시할 업데이트가 없습니다.')}</span>
              </div>
            </div>
            {changes.length > 1 && <>
              <button type="button" className={control} aria-label={paused ? '업데이트 자동 넘김 시작' : '업데이트 자동 넘김 일시 정지'} onClick={() => setPaused(!paused)}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" className={control} aria-label="다음 업데이트" onClick={() => setIndex((i) => (i + 1) % changes.length)}><ChevronDown className="size-4" /></button>
            </>}
          </div>
        </section>

        <a href="/gram/" className={tile + ' block focus-visible:outline-2 focus-visible:outline-violet-300'}>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h2 className={heading}><img src="/gram/moments.png" alt="" className="size-5 shrink-0" />향단이의 Moments</h2>
            <span className={pending}>피드 보기 ↗</span>
          </div>
          {gram && <img src={gram.image} alt={gram.alt} className="mt-2 h-20 w-full rounded-lg object-cover sm:h-24" draggable={false} />}
          <p className="mt-2 line-clamp-2 text-xs text-slate-200">{gramStatus === 'loading' ? '불러오는 중…' : gramStatus === 'error' ? '피드를 불러올 수 없습니다.' : gramStatus === 'empty' ? '아직 게시물이 없습니다.' : gram?.caption || '향단이의 새 게시물'}</p>
        </a>

        <section className={tile}>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h2 className={heading}><Images className="size-4 shrink-0 text-violet-300" aria-hidden />포토</h2>
            <span className={pending}>준비 중</span>
          </div>
          <div className="mt-2 grid h-20 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg sm:h-24" aria-hidden>
            <img src={portrait} alt="" className="row-span-2 h-full w-full object-cover" draggable={false} />
            <img src={winter} alt="" className="h-full w-full object-cover object-left" draggable={false} />
            <img src={BASE + 'wallpapers/pc/lockscreen.jpg'} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        </section>

        <section className={tile + ' col-span-2'} aria-label="음악 플레이어">
          <MusicWidget />
        </section>
      </div>
      <button type="button" onClick={onOpenApps} className={control + ' ml-auto mt-2 shrink-0 bg-slate-950/80'}>앱 페이지 <ChevronRight className="size-4" /></button>
    </section>
  );
}
