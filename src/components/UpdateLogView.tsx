import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PatchNote } from '../types/launcher';

export function UpdateLogView() {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/patch-notes.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PatchNote[];
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setError('업데이트 로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const changeTagStyle: Record<string, string> = {
    NEW: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
    IMPROVE: 'border-sky-500/30 bg-sky-500/20 text-sky-300',
    FIX: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
    SECURITY: 'border-rose-500/30 bg-rose-500/20 text-rose-300',
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950/95 backdrop-blur-2xl">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">업데이트 로그</h2>
            <p className="text-[10px] text-slate-400">
              매일 04:00 KST 자동 동기화 및 패치 기록
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadNotes}
          className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          title="새로고침"
          aria-label="새로고침"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && notes.length === 0 && (
          <p className="py-10 text-center text-xs text-slate-400">
            업데이트 로그를 불러오는 중...
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-xs text-rose-300">
            {error}
          </p>
        )}

        {!loading && !error && notes.length === 0 && (
          <p className="py-10 text-center text-xs text-slate-400">
            기록된 업데이트 로그가 없습니다.
          </p>
        )}

        {notes.map((pn) => (
          <article
            key={pn.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-violet-500/20 px-2 py-0.5 font-mono text-xs font-bold text-violet-300">
                  {pn.version}
                </span>
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {pn.target}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{pn.date}</span>
            </div>

            <h3 className="mt-2 text-sm font-semibold text-white">
              {pn.title}
            </h3>
            <p className="mt-1 text-xs text-slate-300">{pn.summary}</p>

            <ul className="mt-3 space-y-1.5">
              {pn.changes.map((c, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-200"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.2 text-[9px] font-bold ${
                      changeTagStyle[c.type] ?? changeTagStyle.IMPROVE
                    }`}
                  >
                    {c.type}
                  </span>
                  <span className="break-words">{c.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
