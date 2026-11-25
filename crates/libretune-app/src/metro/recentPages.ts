/**
 * When each open page was last shown, so "open pages" lists the most recent
 * first, as the phone's task switcher does. In memory only: after a restart
 * the order falls back to the order the pages were opened in.
 */

const lastShown = new Map<string, number>();
let clock = 0;

export function markShown(tabId: string): void {
  lastShown.set(tabId, ++clock);
}

/** `items` sorted most recently shown first; never-shown ones keep their order, after. */
export function byRecent<T>(items: readonly T[], idOf: (item: T) => string): T[] {
  return items
    .map((item, i) => ({ item, i, t: lastShown.get(idOf(item)) ?? 0 }))
    .sort((a, b) => b.t - a.t || a.i - b.i)
    .map((x) => x.item);
}

/** Test hook. */
export function __resetRecent(): void {
  lastShown.clear();
  clock = 0;
}
