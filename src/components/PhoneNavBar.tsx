import { ChevronLeft, Circle, LayoutGrid } from 'lucide-react';
import { useState } from 'react';

interface PhoneNavBarProps {
  isAppListOpen: boolean;
  onBack: () => void;
  onHome: () => void;
  onToggleAppList: () => void;
}

type NavButtonId = 'back' | 'home' | 'list';

export function PhoneNavBar({
  isAppListOpen,
  onBack,
  onHome,
  onToggleAppList,
}: PhoneNavBarProps) {
  const [rippleKey, setRippleKey] = useState<{
    id: NavButtonId;
    seq: number;
  } | null>(null);

  const triggerFeedback = (id: NavButtonId, action: () => void) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(14);
    }
    setRippleKey((prev) => ({ id, seq: (prev?.seq ?? 0) + 1 }));
    action();
  };

  return (
    <nav
      aria-label="하단 시스템 네비게이션"
      className="relative z-40 flex h-12 shrink-0 items-center justify-around border-t border-white/15 bg-slate-950/95 px-6 backdrop-blur-2xl"
    >
      {/* Left: Back Button */}
      <button
        type="button"
        onClick={() => triggerFeedback('back', onBack)}
        aria-label="뒤로가기"
        title="뒤로가기"
        className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-2xl text-white transition hover:bg-white/10 active:scale-90"
      >
        {rippleKey?.id === 'back' && (
          <span
            key={rippleKey.seq}
            className="animate-nav-ripple pointer-events-none absolute h-9 w-9 rounded-full bg-white/30"
          />
        )}
        <ChevronLeft className="relative z-10 h-6 w-6" />
      </button>

      {/* Center: Home Button */}
      <button
        type="button"
        onClick={() => triggerFeedback('home', onHome)}
        aria-label="홈"
        title="홈 화면으로"
        className="relative flex h-11 w-20 items-center justify-center overflow-hidden rounded-2xl text-white transition hover:bg-white/10 active:scale-90"
      >
        {rippleKey?.id === 'home' && (
          <span
            key={rippleKey.seq}
            className="animate-nav-ripple pointer-events-none absolute h-9 w-9 rounded-full bg-sky-300/35"
          />
        )}
        <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/85">
          <Circle className="h-3 w-3 fill-white/85 text-white/85" />
        </div>
      </button>

      {/* Right: App List Button */}
      <button
        type="button"
        onClick={() => triggerFeedback('list', onToggleAppList)}
        aria-label="앱 리스트"
        title="앱 리스트 열기"
        className={`relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-2xl transition active:scale-90 ${
          isAppListOpen
            ? 'bg-sky-500/25 text-sky-300'
            : 'text-white hover:bg-white/10'
        }`}
      >
        {rippleKey?.id === 'list' && (
          <span
            key={rippleKey.seq}
            className="animate-nav-ripple pointer-events-none absolute h-9 w-9 rounded-full bg-white/30"
          />
        )}
        <LayoutGrid className="relative z-10 h-5 w-5" />
      </button>
    </nav>
  );
}
