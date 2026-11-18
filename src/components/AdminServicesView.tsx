import {
  Check,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';

interface AdminServiceItem {
  slug: string;
  title: string;
  description?: string;
  href: string;
  category_slug?: string;
  hub_publish?: boolean;
  protect_prefix?: string;
  access_policy?: string;
  enabled: boolean;
  sort_order?: number;
}

interface AdminCategoryItem {
  slug: string;
  title: string;
}

interface AdminServicesViewProps {
  onServicesUpdated: () => void;
}

export function AdminServicesView({
  onServicesUpdated,
}: AdminServicesViewProps) {
  const [services, setServices] = useState<AdminServiceItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [csrf, setCsrf] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [href, setHref] = useState('');
  const [categorySlug, setCategorySlug] = useState('service');
  const [accessPolicy, setAccessPolicy] = useState('public');
  const [hubPublish, setHubPublish] = useState(true);
  const [enabled, setEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sessRes, svcRes] = await Promise.all([
        fetch('/auth/session', { credentials: 'include', cache: 'no-store' }),
        fetch('/auth/services', { credentials: 'include', cache: 'no-store' }),
      ]);

      if (sessRes.ok) {
        const sData = await sessRes.json();
        if (sData?.csrf) setCsrf(String(sData.csrf));
      }

      if (!svcRes.ok) {
        const err = await svcRes.json().catch(() => ({}));
        throw new Error(err?.detail || '서비스 목록을 불러올 수 없습니다.');
      }

      const data = await svcRes.json();
      setServices(Array.isArray(data.services) ? data.services : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '서비스 목록 조회 실패',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateForm = () => {
    setSlug('');
    setTitle('');
    setDescription('');
    setHref('/');
    setCategorySlug(categories[0]?.slug ?? 'service');
    setAccessPolicy('public');
    setHubPublish(true);
    setEnabled(true);
    setFormOpen(true);
  };

  const openEditForm = (svc: AdminServiceItem) => {
    setSlug(svc.slug);
    setTitle(svc.title);
    setDescription(svc.description ?? '');
    setHref(svc.href);
    setCategorySlug(svc.category_slug ?? 'service');
    setAccessPolicy(svc.access_policy ?? 'public');
    setHubPublish(svc.hub_publish !== false);
    setEnabled(svc.enabled !== false);
    setFormOpen(true);
  };

  const handleToggle = async (svc: AdminServiceItem) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/auth/services/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ slug: svc.slug, enabled: !svc.enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || '상태 변경 실패');
      if (Array.isArray(data.services)) setServices(data.services);
      onServicesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '상태 변경 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svc: AdminServiceItem) => {
    if (!window.confirm(`"${svc.title}" 서비스를 삭제할까요?`)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/auth/services/delete', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ slug: svc.slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || '삭제 실패');
      if (Array.isArray(data.services)) setServices(data.services);
      onServicesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !title.trim() || !href.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/auth/services', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          description: description.trim(),
          href: href.trim(),
          category_slug: categorySlug,
          hub_publish: hubPublish,
          access_policy: accessPolicy,
          enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || '저장 실패');
      if (Array.isArray(data.services)) setServices(data.services);
      setFormOpen(false);
      onServicesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950/95 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-sky-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">
              등록된 서비스 관리
            </h2>
            <p className="text-[10px] text-slate-400">
              Server-HQ SSO 서비스 레지스트리 ({services.length}개)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-400"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>등록</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            title="새로고침"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {formOpen && (
          <form
            onSubmit={handleSave}
            className="space-y-3 rounded-2xl border border-sky-400/30 bg-slate-900/90 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white">
                서비스 등록 / 수정
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="slug (예: hd2photo)"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="표시 이름"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <input
              type="text"
              required
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="경로 또는 URL (예: /hd2photo/)"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명 (선택)"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))
                ) : (
                  <option value="service">service</option>
                )}
              </select>

              <select
                value={accessPolicy}
                onChange={(e) => setAccessPolicy(e.target.value)}
                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="public">public</option>
                <option value="authenticated">authenticated</option>
                <option value="chairman">chairman</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={hubPublish}
                    onChange={(e) => setHubPublish(e.target.checked)}
                  />
                  <span>허브 게시</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <span>활성화</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>저장</span>
              </button>
            </div>
          </form>
        )}

        {services.map((svc) => (
          <div
            key={svc.slug}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-xs font-semibold text-white">{svc.title}</p>
                <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                  {svc.slug}
                </span>
                {svc.access_policy && (
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] text-sky-300">
                    {svc.access_policy}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {svc.href} {svc.description ? `· ${svc.description}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleToggle(svc)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                  svc.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {svc.enabled ? '활성' : '중지'}
              </button>

              <a
                href={
                  svc.href.startsWith('http')
                    ? svc.href
                    : `https://hd2lab.duckdns.org${svc.href}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="열기"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => openEditForm(svc)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="수정"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(svc)}
                className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/20"
                title="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
