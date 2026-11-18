import { X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { LauncherApp } from '../types/launcher';
import { AVAILABLE_ICON_NAMES, IconGlyph } from './IconGlyph';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddApp: (app: LauncherApp) => void;
}

const GRADIENTS = [
  { label: '스카이', value: 'from-sky-400 via-blue-500 to-indigo-600' },
  { label: '에메랄드', value: 'from-emerald-400 via-teal-500 to-cyan-600' },
  { label: '바이올렛', value: 'from-violet-400 via-purple-500 to-fuchsia-600' },
  { label: '선셋', value: 'from-amber-400 via-orange-500 to-rose-500' },
  { label: '다크', value: 'from-slate-600 via-slate-700 to-zinc-900' },
];

export function AddAppModal({ isOpen, onClose, onAddApp }: AddAppModalProps) {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('https://');
  const [iconName, setIconName] = useState('Globe');
  const [gradient, setGradient] = useState(GRADIENTS[0].value);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newApp: LauncherApp = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      subtitle: subtitle.trim() || '커스텀 웹앱',
      category: 'custom',
      iconName,
      gradient,
      url: url.trim(),
    };
    onAddApp(newApp);
    setName('');
    setSubtitle('');
    setUrl('https://');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            새 웹앱 바로가기 추가
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
            >
              <IconGlyph name={iconName} className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="앱 이름 (예: Grafana, Notion)"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
              />
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="부제목 (선택)"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              대상 URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              아이콘 색상
            </label>
            <div className="flex gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGradient(g.value)}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${g.value} transition ${
                    gradient === g.value
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              아이콘 선택
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {AVAILABLE_ICON_NAMES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setIconName(icon)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    iconName === icon
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconGlyph name={icon} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

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
              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400"
            >
              홈 화면에 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
