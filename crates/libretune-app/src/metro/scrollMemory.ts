import { useCallback, useEffect, useRef } from 'react';

/**
 * Where each page on the back stack was scrolled to, so Back returns to the
 * same place in a list. Only the top page is mounted (MetroShell), so a page
 * left for another one loses its scroll position with its DOM; this keeps it.
 *
 * Positions are recorded per route key as the user scrolls (any scroller
 * inside the page, found again by its child-index path), and put back when
 * the page mounts again. Restoring is retried for a moment, because a list
 * can still be growing while the page turns in. A touch cancels it.
 */

type Positions = Map<string, { top: number; left: number }>;

/** Child-index path from `root` to `el`, e.g. "0/2/1". */
export function pathOf(root: Element, el: Element): string | null {
  const parts: number[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    parts.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  return node === root ? parts.join('/') : null;
}

export function elementAt(root: Element, path: string): Element | null {
  if (path === '') return root;
  let node: Element | undefined = root;
  for (const i of path.split('/')) {
    node = node?.children[Number(i)];
    if (!node) return null;
  }
  return node ?? null;
}

const RETRIES_MS = [0, 50, 150, 300, 500];

export function useScrollMemory(currentKey: number, liveKeys: number[]) {
  const store = useRef(new Map<number, Positions>());
  const keyRef = useRef(currentKey);
  keyRef.current = currentKey;
  const rootRef = useRef<HTMLElement | null>(null);
  const restoring = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pages popped off the stack will not come back: forget them.
  const live = liveKeys.join(',');
  useEffect(() => {
    const keep = new Set(live.split(',').map(Number));
    for (const k of store.current.keys()) if (!keep.has(k)) store.current.delete(k);
  }, [live]);

  const stopRestoring = useCallback(() => {
    restoring.current.forEach(clearTimeout);
    restoring.current = [];
  }, []);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      stopRestoring();
      if (rootRef.current) {
        rootRef.current.removeEventListener('touchstart', stopRestoring);
        rootRef.current.removeEventListener('wheel', stopRestoring);
      }
      rootRef.current = node;
      if (!node) return;
      node.addEventListener('touchstart', stopRestoring, { passive: true });
      node.addEventListener('wheel', stopRestoring, { passive: true });
      const stored = store.current.get(keyRef.current);
      if (!stored || stored.size === 0) return;
      // A copy: an early attempt on a list that is still short scrolls to
      // its end, and that scroll event would overwrite the stored target.
      const saved: Positions = new Map(stored);
      const apply = () => {
        for (const [path, pos] of saved) {
          const el = elementAt(node, path);
          if (!el) continue;
          if (el.scrollTop !== pos.top) el.scrollTop = pos.top;
          if (el.scrollLeft !== pos.left) el.scrollLeft = pos.left;
        }
      };
      restoring.current = RETRIES_MS.map((ms) => setTimeout(apply, ms));
    },
    [stopRestoring],
  );

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const root = rootRef.current;
    const target = e.target as Element;
    if (!root || !(target instanceof Element)) return;
    const path = pathOf(root, target);
    if (path === null) return;
    let positions = store.current.get(keyRef.current);
    if (!positions) {
      positions = new Map();
      store.current.set(keyRef.current, positions);
    }
    positions.set(path, { top: target.scrollTop, left: target.scrollLeft });
  }, []);

  useEffect(() => stopRestoring, [stopRestoring]);

  return { ref, onScroll };
}
