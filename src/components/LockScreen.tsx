import { Lock, Unlock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LockScreenProps {
  wallpaperSrc: string;
  onUnlock: () => void;
}

const UNLOCK_RADIUS = 68;
const MAX_DRAG_RADIUS = 84;

export function LockScreen({ wallpaperSrc, onUnlock }: LockScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateString = now.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const distance = Math.hypot(offset.x, offset.y);
  const progress = Math.min(1, distance / UNLOCK_RADIUS);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (unlocked) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || unlocked) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > MAX_DRAG_RADIUS) {
      const scale = MAX_DRAG_RADIUS / dist;
      setOffset({ x: dx * scale, y: dy * scale });
    } else {
      setOffset({ x: dx, y: dy });
    }
  };

  const handlePointerUp = () => {
    if (!isDragging || unlocked) return;
    setIsDragging(false);

    if (distance >= UNLOCK_RADIUS) {
      setUnlocked(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(18);
      }
      setTimeout(() => onUnlock(), 220);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className={`relative flex h-full w-full touch-none flex-col items-center justify-between overflow-hidden bg-slate-950 select-none transition-all duration-300 ${
        unlocked ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      {/* Lock Screen Wallpaper */}
      <img
        src={wallpaperSrc}
        alt="잠금 화면 배경"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/80" />

      {/* Date & Clock */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+2.75rem)] text-center">
        <p className="text-sm font-medium text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          {dateString}
        </p>
        <h1 className="mt-1 text-7xl font-bold tracking-tight tabular-nums text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          {timeString}
        </h1>
      </div>

      {/* Center-Outward Water-Ripple Unlock Pad */}
      <div className="relative z-10 mb-14 flex flex-col items-center">
        <div className="relative flex h-44 w-44 items-center justify-center">
          {/* Ambient concentric water ripples */}
          <span className="animate-water-ripple pointer-events-none absolute h-16 w-16 rounded-full border border-sky-300/60 bg-sky-400/10" />
          <span className="animate-water-ripple-delay-1 pointer-events-none absolute h-16 w-16 rounded-full border border-white/50 bg-white/5" />
          <span className="animate-water-ripple-delay-2 pointer-events-none absolute h-16 w-16 rounded-full border border-sky-200/40" />

          {/* Outer unlock boundary ring */}
          <div
            className="pointer-events-none absolute h-36 w-36 rounded-full border border-dashed transition-all duration-150"
            style={{
              borderColor:
                progress >= 1
                  ? 'rgba(52, 211, 153, 0.9)'
                  : `rgba(255, 255, 255, ${0.22 + progress * 0.45})`,
              transform: `scale(${1 + progress * 0.12})`,
              boxShadow:
                progress > 0.15
                  ? `0 0 ${18 + progress * 24}px rgba(56, 189, 248, ${0.25 + progress * 0.35})`
                  : 'none',
            }}
          />

          {/* Interactive Center Thumb */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="가운데에서 밖으로 밀어 잠금 해제"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setUnlocked(true);
                setTimeout(() => onUnlock(), 180);
              }
            }}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${
                isDragging ? 1.08 : 1
              })`,
              transition: isDragging
                ? 'none'
                : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className={`relative z-10 flex h-16 w-16 cursor-grab touch-none items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl active:cursor-grabbing ${
              progress >= 1
                ? 'border-emerald-300 bg-emerald-400/90 text-slate-950'
                : 'border-white/40 bg-white/25 text-white'
            }`}
          >
            {progress >= 1 ? (
              <Unlock className="h-6 w-6" />
            ) : (
              <Lock className="h-6 w-6 drop-shadow" />
            )}
          </div>
        </div>

        <p className="mt-1 text-xs font-medium tracking-wide text-white/85 drop-shadow">
          가운데에서 밖으로 밀어 잠금 해제
        </p>
      </div>
    </div>
  );
}
