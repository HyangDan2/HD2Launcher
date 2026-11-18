import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const WEB_HQ_APPS_PATH = path.join(DATA_DIR, 'web-hq-apps.json');
const PATCH_NOTES_PATH = path.join(DATA_DIR, 'patch-notes.json');

const APP_GRADIENTS = [
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-violet-400 via-purple-500 to-fuchsia-600',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-pink-400 via-rose-500 to-red-600',
  'from-cyan-400 via-sky-500 to-blue-600',
  'from-indigo-400 via-violet-500 to-purple-600',
  'from-lime-400 via-emerald-500 to-green-600',
];

const GAME_GRADIENTS = [
  'from-fuchsia-500 via-purple-600 to-indigo-700',
  'from-rose-500 via-red-600 to-orange-600',
  'from-cyan-500 via-blue-600 to-indigo-700',
  'from-emerald-500 via-teal-600 to-cyan-700',
];

const TRACKED_REPOS = [
  { repo: 'HyangDan2/HyangDan2.github.io', target: 'Web-HQ' },
  { repo: 'HyangDan2/ApplicationHub', target: 'Web-HQ' },
  { repo: 'HyangDan2/GameHub', target: 'Web-HQ' },
  { repo: 'HyangDan2/TechnicalHub', target: 'Web-HQ' },
  { repo: 'HyangDan2/diary', target: 'Web-HQ' },
  { repo: 'HyangDan2/HD2Launcher', target: 'Launcher' },
];

async function fetchJson(url) {
  const headers = { 'User-Agent': 'HD2Launcher-DailySync/1.0' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function classifyCommit(message) {
  const line = message.split('\n')[0].trim();
  const lower = line.toLowerCase();
  if (lower.startsWith('feat') || lower.startsWith('add')) {
    return { type: 'NEW', text: line };
  }
  if (lower.startsWith('fix') || lower.startsWith('bug')) {
    return { type: 'FIX', text: line };
  }
  if (lower.startsWith('sec')) {
    return { type: 'SECURITY', text: line };
  }
  return { type: 'IMPROVE', text: line };
}

async function syncWebHqApps() {
  const [appsData, gamesData] = await Promise.all([
    fetchJson('https://hyangdan2.github.io/ApplicationHub/data/apps.json'),
    fetchJson('https://hyangdan2.github.io/GameHub/data/games.json'),
  ]);

  const rawApps = Array.isArray(appsData)
    ? appsData
    : appsData.apps ?? appsData.items ?? [];
  const rawGames = Array.isArray(gamesData)
    ? gamesData
    : gamesData.games ?? gamesData.items ?? [];

  const hubLinks = [
    {
      id: 'webhq-main',
      name: 'Web-HQ',
      subtitle: 'hyangdan2.github.io',
      category: 'web-hq',
      iconName: 'Globe',
      gradient: 'from-sky-400 via-blue-500 to-indigo-600',
      url: 'https://hyangdan2.github.io/',
    },
    {
      id: 'webhq-technical-hub',
      name: 'Tech Hub',
      subtitle: 'Technical Hub',
      category: 'web-hq',
      iconName: 'Cpu',
      gradient: 'from-slate-600 via-slate-700 to-zinc-900',
      url: 'https://hyangdan2.github.io/TechnicalHub/',
    },
    {
      id: 'webhq-diary',
      name: 'Diary',
      subtitle: '개발/일상 기록',
      category: 'web-hq',
      iconName: 'BookOpen',
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      url: 'https://hyangdan2.github.io/diary/',
    },
  ];

  const appItems = rawApps
    .filter((a) => !a.status || a.status === 'published')
    .map((a, idx) => ({
      id: `app-${a.id}`,
      name: a.title || a.name || a.id,
      subtitle: a.subtitle || a.category || 'Application',
      category: 'web-hq',
      iconName: 'AppWindow',
      gradient: APP_GRADIENTS[idx % APP_GRADIENTS.length],
      url: a.launchUrl || a.url,
      thumbnailUrl: a.thumbnail
        ? `https://hyangdan2.github.io/ApplicationHub/${a.thumbnail}`
        : undefined,
    }))
    .filter((a) => Boolean(a.url));

  const gameItems = rawGames
    .filter((g) => !g.status || g.status === 'published')
    .map((g, idx) => ({
      id: `game-${g.id}`,
      name: g.title || g.name || g.id,
      subtitle: g.subtitle || g.genre || 'Game',
      category: 'game',
      iconName: 'Gamepad2',
      gradient: GAME_GRADIENTS[idx % GAME_GRADIENTS.length],
      url: g.playUrl || g.url,
      thumbnailUrl: g.thumbnail
        ? `https://hyangdan2.github.io/GameHub/${g.thumbnail}`
        : undefined,
      allowZoom: true,
    }))
    .filter((g) => Boolean(g.url));

  const combined = [...hubLinks, ...appItems, ...gameItems];
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    WEB_HQ_APPS_PATH,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        apps: combined,
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  console.log(`Synced ${combined.length} Web-HQ apps/games.`);
  return combined.length;
}

async function syncPatchNotes(syncedCount) {
  let existing = [];
  try {
    const raw = await fs.readFile(PATCH_NOTES_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }

  // KST date string
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().slice(0, 10);
  const timeStr = kst.toISOString().slice(11, 16);
  const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const changes = [];
  for (const { repo, target } of TRACKED_REPOS) {
    try {
      const commits = await fetchJson(
        `https://api.github.com/repos/${repo}/commits?since=${encodeURIComponent(sinceIso)}&per_page=10`,
      );
      if (Array.isArray(commits)) {
        for (const c of commits) {
          const msg = c.commit?.message || '';
          if (msg.startsWith('chore(sync):')) continue;
          const classified = classifyCommit(msg);
          changes.push({
            type: classified.type,
            text: `[${target}/${repo.split('/')[1]}] ${classified.text}`,
          });
        }
      }
    } catch {
      // Repo may not exist yet (e.g. before first push) — skip cleanly
    }
  }

  if (changes.length === 0) {
    changes.push({
      type: 'IMPROVE',
      text: `Web-HQ 앱/게임 목록(${syncedCount}개) 정기 동기화 완료`,
    });
  }

  const entryId = `sync-${dateStr}`;
  const newEntry = {
    id: entryId,
    version: dateStr.replace(/-/g, '.'),
    date: `${dateStr} ${timeStr} KST`,
    target: 'Web-HQ',
    title: '04:00 정기 동기화 및 패치 기록',
    summary: `최근 24시간 동안 반영된 변경사항 ${changes.length}건을 기록했습니다.`,
    changes: changes.slice(0, 20),
  };

  const filtered = existing.filter((e) => e.id !== entryId);
  const updated = [newEntry, ...filtered].slice(0, 60);

  await fs.writeFile(
    PATCH_NOTES_PATH,
    JSON.stringify(updated, null, 2) + '\n',
    'utf-8',
  );
  console.log(`Recorded patch note ${entryId} (${changes.length} changes).`);
}

async function main() {
  const count = await syncWebHqApps();
  await syncPatchNotes(count);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
