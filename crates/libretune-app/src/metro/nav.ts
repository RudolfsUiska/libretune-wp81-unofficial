import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Page navigation, Windows Phone style: a back stack of pages, where the
 * hardware Back button (Android's, via the WebView history) pops one level.
 *
 * Every push adds a browser history entry tagged with the stack depth, so
 * MainActivity's `webView.canGoBack()` sees it and Back becomes `popstate`.
 * Transient layers (an open app bar, a picker, the tile edit mode) are pushed
 * the same way, which makes Back close them first, as on the phone.
 *
 * `useFullscreenView` (utils/viewFullscreen.ts) also pushes entries; it spreads
 * the existing state, so its entries carry the same depth and are ignored here.
 */

export type Route =
  | { kind: 'start' }
  | { kind: 'apps' }
  | { kind: 'tune'; menu?: string }
  | { kind: 'page'; tabId: string }
  | { kind: 'tasks' }
  | { kind: 'projects' }
  | { kind: 'connect' }
  | { kind: 'settings' }
  | { kind: 'theme' };

type Entry =
  | { type: 'route'; route: Route; key: number }
  | { type: 'layer'; id: number; onBack: () => void };

const DEPTH = 'metroDepth';
/** utils/viewFullscreen.ts tags its own entries with this. */
const FULLSCREEN_FLAG = 'libretuneDashboardFullscreen';

declare global {
  interface Window {
    /** Called by MainActivity on Android Back; true when the page handled it. */
    __metroBack?: () => boolean;
  }
}
let nextKey = 1;

interface Snapshot {
  routes: { route: Route; key: number }[];
  /** +1 after a push, -1 after a pop: picks the page transition. */
  direction: 1 | -1;
}

class Nav {
  private entries: Entry[] = [{ type: 'route', route: { kind: 'start' }, key: nextKey++ }];
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = this.build(1);
  private installed = false;

  install(): void {
    if (this.installed) return;
    this.installed = true;
    window.history.replaceState({ ...window.history.state, [DEPTH]: 1 }, '');
    // Android Back asks here first (MainActivity). The WebView's own Back
    // skips history entries that were added without a tap - a swipe to the
    // app list is not a tap - and would leave the app instead of the page.
    // history.back() from the page does not skip them.
    window.__metroBack = () => {
      const st = (window.history.state ?? {}) as Record<string, unknown>;
      const depth = Number(st[DEPTH]) || 1;
      if (depth > 1 || st[FULLSCREEN_FLAG]) {
        window.history.back();
        return true;
      }
      return false;
    };
    window.addEventListener('popstate', (e) => {
      const depth = Number((e.state as Record<string, unknown> | null)?.[DEPTH]) || 1;
      this.popTo(depth);
    });
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private build(direction: 1 | -1): Snapshot {
    const routes = this.entries.flatMap((e) => (e.type === 'route' ? [{ route: e.route, key: e.key }] : []));
    return { routes, direction };
  }

  private emit(direction: 1 | -1) {
    this.snapshot = this.build(direction);
    this.listeners.forEach((l) => l());
  }

  private pushEntry(entry: Entry) {
    this.entries.push(entry);
    window.history.pushState({ ...window.history.state, [DEPTH]: this.entries.length }, '');
  }

  push(route: Route): void {
    // Opening the page that is already on top is a no-op, not a new level.
    const top = this.topRoute();
    if (top && sameRoute(top, route)) return;
    this.pushEntry({ type: 'route', route, key: nextKey++ });
    this.emit(1);
  }

  /** Swap the top page without adding a level (e.g. tasks -> the chosen page). */
  replace(route: Route): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      if (e.type === 'route') {
        this.entries[i] = { type: 'route', route, key: nextKey++ };
        break;
      }
    }
    this.emit(1);
  }

  /** Reset to a new root (e.g. after a project closes). */
  reset(route: Route): void {
    const extra = this.entries.length - 1;
    this.entries = [{ type: 'route', route, key: nextKey++ }];
    if (extra > 0) {
      this.ignorePops += 1;
      window.history.go(-extra);
    }
    this.emit(-1);
  }

  private ignorePops = 0;

  back(): void {
    if (this.entries.length > 1) window.history.back();
  }

  home(): void {
    const extra = this.entries.length - 1;
    if (extra > 0) window.history.go(-extra);
  }

  topRoute(): Route | null {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      if (e.type === 'route') return e.route;
    }
    return null;
  }

  private popTo(depth: number) {
    if (this.ignorePops > 0) {
      this.ignorePops -= 1;
      return;
    }
    let poppedRoute = false;
    while (this.entries.length > Math.max(1, depth)) {
      const e = this.entries.pop()!;
      if (e.type === 'layer') e.onBack();
      else poppedRoute = true;
    }
    if (poppedRoute) this.emit(-1);
  }

  private nextLayer = 1;

  /** Push a Back-closable layer; returns a function that removes it. */
  pushLayer(onBack: () => void): () => void {
    const id = this.nextLayer++;
    this.pushEntry({ type: 'layer', id, onBack });
    return () => {
      const idx = this.entries.findIndex((e) => e.type === 'layer' && e.id === id);
      if (idx < 0) return;
      if (idx === this.entries.length - 1) {
        // Ours is on top: leave through history so no dead entry is left.
        // Drop it now, so a navigation queued right after sees the new depth.
        this.entries.pop();
        this.ignorePops += 1;
        window.history.back();
      } else {
        this.entries.splice(idx, 1);
      }
    };
  }
}

function sameRoute(a: Route, b: Route): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const nav = new Nav();

export function useNav(): Snapshot {
  return useSyncExternalStore(nav.subscribe, nav.getSnapshot);
}

/**
 * While `active`, Back calls `onBack` instead of leaving the page. Closing it
 * any other way (tapping outside, choosing an item) removes the history entry.
 */
export function useBackLayer(active: boolean, onBack: () => void): void {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    if (!active) return;
    return nav.pushLayer(() => cb.current());
  }, [active]);
}
