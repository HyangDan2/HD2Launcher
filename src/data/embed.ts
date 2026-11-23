// Legacy opt-out query flag for apps that read ?embed=launcher at load time.
// Modern apps auto-detect via `window.self !== window.top` + `hd2:viewport` postMessage.
const embeddedPaths = new Map([
  ['https://hd2lab.duckdns.org', new Set(['/hd2photo/', '/welcome-to-hd2-forest/'])],
  ['https://hyangdan2.github.io', new Set(['/PKPilot0008/', '/AGPilot0001/'])],
]);

export function embeddedAppUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    const path = parsed.pathname.replace(/\/?$/, '/');
    if (embeddedPaths.get(parsed.origin)?.has(path)) {
      parsed.searchParams.set('embed', 'launcher');
      return parsed.href;
    }
  } catch {
    // Leave unsupported URLs to the iframe's normal handling.
  }
  return url;
}

export interface LauncherViewportMessage {
  type: 'hd2:viewport';
  embedded: true;
  mode: 'pwa' | 'browser';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  insetTop: number;
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
    Boolean((navigator as { standalone?: boolean }).standalone)
  );
}

/**
 * Broadcasts the actual allocated iframe viewport geometry to the embedded app
 * (works for both same-origin Server-HQ and cross-origin Web-HQ apps).
 */
export function broadcastLauncherViewport(frame: HTMLIFrameElement | null): void {
  if (!frame?.contentWindow) return;
  const rect = frame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const message: LauncherViewportMessage = {
    type: 'hd2:viewport',
    embedded: true,
    mode: isStandaloneMode() ? 'pwa' : 'browser',
    orientation: rect.width >= rect.height ? 'landscape' : 'portrait',
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    insetTop: 0,
    insetRight: 0,
    insetBottom: 0,
    insetLeft: 0,
  };

  try {
    frame.contentWindow.postMessage(message, '*');
  } catch {
    // Ignore if iframe is not ready or detached.
  }
}
