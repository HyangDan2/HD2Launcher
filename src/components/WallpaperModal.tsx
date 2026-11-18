import { Check, Image as ImageIcon, X } from 'lucide-react';
import { useState } from 'react';
import { LAUNCHER_WALLPAPERS } from '../data/services';

interface WallpaperModalProps {
  isOpen: boolean;
  homeWallpaper: string;
  lockWallpaper: string;
  onSelectHomeWallpaper: (src: string) => void;
  onSelectLockWallpaper: (src: string) => void;
  onClose: () => void;
}

export function WallpaperModal({
  isOpen,
  homeWallpaper,
  lockWallpaper,
  onSelectHomeWallpaper,
  onSelectLockWallpaper,
  onClose,
}: WallpaperModalProps) {
  const [target, setTarget] = useState<'home' | 'lock'>('home');

  if (!isOpen) return null;

  const currentSrc = target === 'home' ? homeWallpaper : lockWallpaper;
  const handleSelect = (src: string) => {
    if (target === 'home') {
      onSelectHomeWallpaper(src);
    } else {
      onSelectLockWallpaper(src);
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl border-t border-white/20 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">배경화면 변경</h2>
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

        {/* Target Switch: Home vs Lock */}
        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTarget('home')}
            className={`rounded-xl py-1.5 text-xs font-semibold transition ${
              target === 'home'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            홈 화면 배경
          </button>
          <button
            type="button"
            onClick={() => setTarget('lock')}
            className={`rounded-xl py-1.5 text-xs font-semibold transition ${
              target === 'lock'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            잠금 화면 배경
          </button>
        </div>

        {/* Wallpaper Thumbnails */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          {LAUNCHER_WALLPAPERS.map((wp) => {
            const isSelected = currentSrc === wp.src;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => handleSelect(wp.src)}
                className={`group relative overflow-hidden rounded-2xl border text-left transition ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-400/50'
                    : 'border-white/15 hover:border-white/35'
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden">
                  <img
                    src={wp.src}
                    alt={wp.label}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="bg-slate-900/90 px-3 py-2">
                  <p className="text-xs font-medium text-white">{wp.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
