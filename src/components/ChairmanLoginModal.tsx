import { KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface ChairmanLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChairmanLoginModal({
  isOpen,
  onClose,
  onSuccess,
}: ChairmanLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [csrf, setCsrf] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setPassword('');
    fetch('/auth/session', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.authenticated === true) {
          onSuccess();
          return;
        }
        if (data.csrf) {
          setCsrf(String(data.csrf));
        }
      })
      .catch(() => {
        setErrorMsg('SSO 세션 서버에 연결할 수 없습니다.');
      });
  }, [isOpen, onSuccess]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      let token = csrf;
      if (!token) {
        const sRes = await fetch('/auth/session', {
          credentials: 'include',
          cache: 'no-store',
        });
        const sData = sRes.ok ? await sRes.json() : null;
        if (sData?.authenticated === true) {
          onSuccess();
          return;
        }
        token = sData?.csrf ?? '';
        setCsrf(token);
      }

      const res = await fetch('/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          next: '/',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(
          data?.detail || '아이디 또는 비밀번호를 확인해 주세요.',
        );
        return;
      }

      if (data?.securityRequired) {
        window.location.href = `/auth/security?next=${encodeURIComponent(window.location.href)}`;
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg('로그인 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Chairman 관리자 로그인
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Chairman 아이디
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 입력"
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:opacity-50"
            >
              {loading ? '인증 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
