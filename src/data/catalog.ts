import type { LauncherApp } from '../types/launcher';
import { DEFAULT_SERVICES } from './services';

const legacyIds = new Map([
  ['market', 'hd2lab-market'],
  ['stories-public', 'hd2-stories'],
  ['lingo-public', 'hd2-lingo'],
  ['welcome-to-hd2-forest', 'hd2-forest'],
  ['hd2photo', 'hd2-photo'],
  ['hd2ai-public', 'hd2-ai'],
  ['solver', 'hd2-solver'],
]);

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    return;
  }
}

function unique(apps: LauncherApp[]) {
  return [...new Map(apps.map((app) => [app.id, app])).values()];
}

export function readWebCatalog(data: { apps?: unknown[] }) {
  if (!Array.isArray(data?.apps)) throw new Error('Invalid Web-HQ catalog');
  return unique(data.apps.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Partial<LauncherApp>;
    const url = httpsUrl(row.url);
    if (!url || !row.id || !/^(webhq|app|game)-[\w-]+$/.test(row.id) || typeof row.name !== 'string') return [];
    const game = row.category === 'game';
    return [{
      id: row.id,
      name: row.name,
      subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
      category: game ? 'game' : 'web-hq',
      iconName: typeof row.iconName === 'string' ? row.iconName : 'AppWindow',
      gradient: typeof row.gradient === 'string' ? row.gradient : 'from-sky-400 to-indigo-600',
      url,
      thumbnailUrl: httpsUrl(row.thumbnailUrl),
      allowZoom: game,
    } satisfies LauncherApp];
  }));
}

type ManifestHub = 'service' | 'ai';

export function readServerCatalog(data: { version?: number; hub?: string; items?: unknown[] }, hub: ManifestHub) {
  if (data?.version !== 1 || data.hub !== hub || !Array.isArray(data.items)) throw new Error('Invalid Server-HQ catalog');
  return unique(data.items.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const { id, name, path, summary, access } = value as Record<string, unknown>;
    if (access !== 'none' || typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)
      || typeof name !== 'string' || typeof summary !== 'string' || typeof path !== 'string'
      || !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(path)
      || /^\/(?:admin|auth|api)(?:\/|$)/i.test(path)) return [];

    const existing = DEFAULT_SERVICES.find((app) => app.id === legacyIds.get(id))
      ?? DEFAULT_SERVICES.find((app) => app.url.replace(/\/$/, '') === ('https://hd2lab.duckdns.org' + path).replace(/\/$/, ''));
    return [{
      iconName: 'AppWindow',
      gradient: 'from-teal-400 to-indigo-600',
      ...existing,
      category: hub === 'ai' ? 'ai-hub' : 'service-hub',
      id: existing?.id ?? 'server-' + id,
      name,
      subtitle: summary,
      url: 'https://hd2lab.duckdns.org' + path,
    } satisfies LauncherApp];
  }));
}

const manifestOwnedIds = new Set(['hd2lab-market', 'hd2-stories', 'hd2-lingo', 'hd2-ai', 'hd2-solver']);

const livingHub: LauncherApp = {
  id: 'server-living-hub',
  name: 'Living Hub',
  subtitle: 'HD2Lab 저널',
  category: 'hq',
  iconName: 'BookOpen',
  gradient: 'from-emerald-400 to-teal-600',
  url: 'https://hd2lab.duckdns.org/living/',
};

export function mergeServerCatalog(serviceApps: LauncherApp[], aiApps: LauncherApp[]) {
  const entries = new Map([...serviceApps, ...aiApps].map((app) => [app.id, app]));
  const builtIn = DEFAULT_SERVICES.flatMap((app) => {
    const entry = entries.get(app.id);
    if (entry) {
      entries.delete(app.id);
      return [entry];
    }
    // Keep launcher-owned shortcuts and the existing public direct links.
    return manifestOwnedIds.has(app.id) ? [] : [app];
  });
  return [...builtIn, livingHub, ...entries.values()];
}
