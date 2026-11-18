import { LauncherApp, WallpaperOption } from '../types/launcher';

export const LAUNCHER_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'winter-street',
    label: '눈 내리는 거리',
    src: '/wallpapers/homescreen.jpg',
  },
  {
    id: 'winter-hands',
    label: '겨울밤 인사',
    src: '/wallpapers/lockscreen.png',
  },
  {
    id: 'hd2lab-dark',
    label: 'HD²LAB Beyond',
    src: '/wallpapers/admin-bg.png',
  },
];

export const ADMIN_WALLPAPER_SRC = '/wallpapers/admin-bg.png';

export const ADMIN_GATE_APP: LauncherApp = {
  id: 'admin-sso-gate',
  name: '관리자',
  subtitle: 'SSO 관리자 메뉴',
  category: 'admin',
  iconName: 'ShieldCheck',
  gradient: 'from-rose-500 via-red-600 to-orange-700',
  url: 'https://hd2lab.duckdns.org/auth/login',
  internalView: 'admin-sso',
};

export const CORE_ADMIN_APPS: LauncherApp[] = [
  {
    id: 'admin-hq',
    name: 'Admin HQ',
    subtitle: '관리자 포털',
    category: 'admin',
    iconName: 'ShieldCheck',
    gradient: 'from-rose-500 via-red-600 to-orange-700',
    url: 'https://hd2lab.duckdns.org/admin/',
    adminOnly: true,
  },
  {
    id: 'admin-chairman',
    name: 'Chairman',
    subtitle: '최고 관리자 콘솔',
    category: 'admin',
    iconName: 'Crown',
    gradient: 'from-amber-500 via-yellow-600 to-orange-700',
    url: 'https://hd2lab.duckdns.org/admin/chairman/',
    adminOnly: true,
  },
  {
    id: 'admin-services-mgr',
    name: '서비스 관리',
    subtitle: '등록 서비스 설정',
    category: 'admin',
    iconName: 'Settings',
    gradient: 'from-sky-500 via-indigo-600 to-violet-700',
    url: '',
    internalView: 'admin-services',
    adminOnly: true,
  },
];

export const ADMIN_ADD_APP: LauncherApp = {
  id: 'admin-add-service',
  name: '서비스 추가',
  subtitle: '커스텀 앱 등록',
  category: 'admin',
  iconName: 'FolderKanban',
  gradient: 'from-slate-600 via-slate-700 to-zinc-900',
  url: '',
  internalView: 'add-app',
  adminOnly: true,
};

export const DEFAULT_SERVICES: LauncherApp[] = [
  // HQ Core
  {
    id: 'server-hq',
    name: 'Server-HQ',
    subtitle: 'HD2Lab 메인 허브',
    category: 'hq',
    iconName: 'Server',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    url: 'https://hd2lab.duckdns.org/',
  },
  {
    id: 'status-hq',
    name: 'Status HQ',
    subtitle: '서버 상태 모니터',
    category: 'hq',
    iconName: 'Activity',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    url: 'https://status.hd2lab.duckdns.org/',
  },
  {
    id: 'update-log',
    name: '업데이트 로그',
    subtitle: '04:00 패치 기록',
    category: 'hq',
    iconName: 'Sparkles',
    gradient: 'from-violet-400 via-purple-500 to-fuchsia-600',
    url: '',
    internalView: 'update-log',
  },

  // Service Hub
  {
    id: 'hd2lab-market',
    name: 'HD2 Market',
    subtitle: 'Service Hub',
    category: 'service-hub',
    iconName: 'ShoppingBag',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    url: 'https://hd2lab.duckdns.org/market/',
  },
  {
    id: 'hd2-stories',
    name: 'Stories',
    subtitle: 'Service Hub',
    category: 'service-hub',
    iconName: 'BookOpen',
    gradient: 'from-pink-400 via-rose-500 to-red-600',
    url: 'https://hd2lab.duckdns.org/stories/',
    openExternal: true,
  },
  {
    id: 'hd2-photo',
    name: 'HD2Photo',
    subtitle: '포토 클라우드',
    category: 'service-hub',
    iconName: 'Image',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    url: 'https://hd2lab.duckdns.org/hd2photo/',
    openExternal: true,
  },
  {
    id: 'hd2-lingo',
    name: 'HD2Lingo',
    subtitle: '언어 학습',
    category: 'service-hub',
    iconName: 'Languages',
    gradient: 'from-lime-400 via-emerald-500 to-green-600',
    url: 'https://hd2lab.duckdns.org/lingo/',
  },
  {
    id: 'hd2-forest',
    name: 'HD2 Forest',
    subtitle: '2D 메타버스',
    category: 'service-hub',
    iconName: 'Trees',
    gradient: 'from-teal-400 via-emerald-500 to-cyan-700',
    url: 'https://hd2lab.duckdns.org/welcome-to-hd2-forest/',
    allowZoom: true,
  },

  // AI Hub
  {
    id: 'hd2-ai',
    name: 'HD2AI',
    subtitle: 'Hyangdani AI',
    category: 'ai-hub',
    iconName: 'Sparkles',
    gradient: 'from-violet-400 via-purple-500 to-fuchsia-600',
    url: 'https://hd2lab.duckdns.org/HD2AI/',
  },
  {
    id: 'hd2-solver',
    name: 'Solver',
    subtitle: 'AI 비전 풀이',
    category: 'ai-hub',
    iconName: 'BrainCircuit',
    gradient: 'from-indigo-400 via-blue-500 to-cyan-600',
    url: 'https://hd2lab.duckdns.org/solver/',
    allowZoom: true,
  },
];
