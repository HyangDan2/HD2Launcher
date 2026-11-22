// These apps opt out of device insets when the launcher supplies the viewport.
const embeddedPaths = new Map([
  ['https://hd2lab.duckdns.org', new Set(['/hd2photo/', '/welcome-to-hd2-forest/'])],
  ['https://hyangdan2.github.io', new Set(['/PKPilot0008/'])],
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
