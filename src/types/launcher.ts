export type AppCategory =
  | 'service-hub'
  | 'ai-hub'
  | 'hq'
  | 'web-hq'
  | 'game'
  | 'admin'
  | 'custom';

export interface LauncherApp {
  id: string;
  name: string;
  subtitle: string;
  category: AppCategory;
  iconName: string;
  gradient: string;
  url: string;
  thumbnailUrl?: string;
  internalView?: 'update-log';
  adminOnly?: boolean;
  /** 서비스별 메인 뷰포트 확대/스크롤 허용 여부 */
  allowZoom?: boolean;
}

export interface WallpaperOption {
  id: string;
  label: string;
  src: string;
}

export interface PatchChange {
  type: 'NEW' | 'IMPROVE' | 'FIX' | 'SECURITY';
  text: string;
}

export interface PatchNote {
  id: string;
  version: string;
  date: string;
  target: string;
  title: string;
  summary: string;
  changes: PatchChange[];
}
