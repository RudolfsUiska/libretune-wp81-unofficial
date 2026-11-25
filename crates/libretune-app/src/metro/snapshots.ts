import { useSyncExternalStore } from 'react';

/**
 * Screenshots of open pages for the "open pages" switcher, as on Windows
 * Phone. The Android app draws its WebView into a small JPEG
 * (MainActivity.kt SnapshotBridge); elsewhere there is no bridge, nothing is
 * captured, and the switcher shows its icon cards as before.
 *
 * Pictures live in memory only: they are a glance aid, and a stale one after
 * a restart would show values that are no longer true.
 */

interface NativeBridge {
  snapshot(token: string, maxWidth: number): void;
}

declare global {
  interface Window {
    LibreTuneNative?: NativeBridge;
    __metroSnapshotDone?: (token: string, dataUrl: string) => void;
  }
}

/** Width of the stored picture, in device pixels: enough for a card. */
const MAX_WIDTH = 540;
/** Give up on a capture that has not come back (the page keeps going). */
const TIMEOUT_MS = 1500;

const shots = new Map<string, string>();
const listeners = new Set<() => void>();
const pending = new Map<string, (url: string) => void>();
let seq = 0;

function emit() {
  for (const l of listeners) l();
}

function install() {
  if (typeof window === 'undefined' || window.__metroSnapshotDone) return;
  window.__metroSnapshotDone = (token, dataUrl) => {
    const done = pending.get(token);
    pending.delete(token);
    done?.(dataUrl);
  };
}

export const canSnapshot = () => typeof window !== 'undefined' && !!window.LibreTuneNative;

/**
 * Capture the screen as it is now and keep it as `tabId`'s picture. Resolves
 * when stored (or given up); never rejects.
 */
export function captureTab(tabId: string): Promise<void> {
  const bridge = typeof window !== 'undefined' ? window.LibreTuneNative : undefined;
  if (!bridge) return Promise.resolve();
  install();
  const token = `s${++seq}`;
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(token);
      resolve();
    }, TIMEOUT_MS);
    pending.set(token, (url) => {
      clearTimeout(timer);
      if (url) {
        shots.set(tabId, url);
        emit();
      }
      resolve();
    });
    try {
      bridge.snapshot(token, Math.round(MAX_WIDTH));
    } catch {
      clearTimeout(timer);
      pending.delete(token);
      resolve();
    }
  });
}

export function dropSnapshot(tabId: string) {
  if (shots.delete(tabId)) emit();
}

/** Forget pictures of pages that are no longer open. */
export function pruneSnapshots(openIds: string[]) {
  const keep = new Set(openIds);
  let changed = false;
  for (const id of shots.keys()) {
    if (!keep.has(id)) {
      shots.delete(id);
      changed = true;
    }
  }
  if (changed) emit();
}

export function getSnapshot(tabId: string): string | undefined {
  return shots.get(tabId);
}

let version = 0;
listeners.add(() => {
  version++;
});

/** Re-render when any picture changes. */
export function useSnapshots(): (tabId: string) => string | undefined {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
  return getSnapshot;
}

/** Test hook. */
export function __resetSnapshots() {
  shots.clear();
  pending.clear();
  emit();
}
