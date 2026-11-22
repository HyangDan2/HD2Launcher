export const SLOTS_PER_PAGE = 20;
export const WEB_START = SLOTS_PER_PAGE;
export const ADMIN_GATE_START = 2 * SLOTS_PER_PAGE;
export const ADMIN_START = 3 * SLOTS_PER_PAGE;
export const TOTAL_SLOTS = 5 * SLOTS_PER_PAGE;

export function getPageStarts(slotCount: number, showAdmin: boolean) {
  const starts = [0, WEB_START];
  // Overflow is stored after the original slots so old layouts keep their indices.
  for (let start = TOTAL_SLOTS; start < slotCount; start += SLOTS_PER_PAGE) {
    starts.push(start);
  }
  starts.push(ADMIN_GATE_START);
  if (showAdmin) starts.push(ADMIN_START, ADMIN_START + SLOTS_PER_PAGE);
  return starts;
}

export function isAdminPage(start: number | null | undefined) {
  return start != null && start >= ADMIN_START && start < TOTAL_SLOTS;
}

export function placeWebApps(slots: (string | null)[], ids: string[]) {
  if (!ids.length) return slots;
  const catalog = new Set(ids);
  const next = [...slots];
  const available: number[] = [];

  for (let i = WEB_START; i < next.length; i++) {
    if (i >= ADMIN_GATE_START && i < TOTAL_SLOTS) continue;
    const id = next[i];
    if (id && /^(webhq|app|game)-/.test(id) && !catalog.has(id)) next[i] = null;
    if (next[i] === null) available.push(i);
  }

  const pinned = new Set(next);
  let cursor = 0;
  for (const id of catalog) {
    if (pinned.has(id)) continue;
    if (cursor === available.length) {
      for (let i = 0; i < SLOTS_PER_PAGE; i++) {
        available.push(next.length);
        next.push(null);
      }
    }
    next[available[cursor++]] = id;
  }
  return next.length === slots.length && next.every((id, i) => id === slots[i]) ? slots : next;
}
