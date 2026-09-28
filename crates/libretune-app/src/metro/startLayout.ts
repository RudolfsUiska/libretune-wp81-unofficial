import { useEffect, useState } from 'react';
import type { TileSize } from './controls';

/**
 * Tiles on the Start screen: built-in tiles plus pages the user pinned. The
 * order and sizes are stored per device, like the rest of the Metro prefs.
 */
export interface StartTile {
  id: string;
  size: TileSize;
  /** Pinned pages: the tab target and its title. */
  target?: string;
  label?: string;
  kind?: string;
}

const KEY = 'libretune.metro.start';
const EVENT = 'libretune:metro-start';

export const DEFAULT_TILES: StartTile[] = [
  { id: 'connect', size: 'wide' },
  { id: 'dashboard', size: 'medium' },
  { id: 'tune', size: 'medium' },
  { id: 'log', size: 'medium' },
  { id: 'burn', size: 'small' },
  { id: 'save', size: 'small' },
  { id: 'open', size: 'small' },
  { id: 'pages', size: 'small' },
  { id: 'autotune', size: 'medium' },
  { id: 'project', size: 'medium' },
  { id: 'settings', size: 'small' },
  { id: 'search', size: 'small' },
  { id: 'console', size: 'small' },
  { id: 'help', size: 'small' },
];

export function getStartTiles(): StartTile[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(raw)) return raw.filter((t) => t && typeof t.id === 'string');
  } catch {
    // fall through to the defaults
  }
  return DEFAULT_TILES;
}

export function setStartTiles(tiles: StartTile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tiles));
  } catch {
    // Storage unavailable: the layout lasts this session only.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function resetStartTiles(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function pinToStart(target: string, label: string, kind?: string): boolean {
  const tiles = getStartTiles();
  const id = `pin:${target}`;
  if (tiles.some((t) => t.id === id)) return false;
  setStartTiles([...tiles, { id, size: 'medium', target, label, kind }]);
  return true;
}

export function isPinned(target: string): boolean {
  return getStartTiles().some((t) => t.id === `pin:${target}`);
}

export function useStartTiles(): StartTile[] {
  const [tiles, setTiles] = useState(getStartTiles);
  useEffect(() => {
    const on = () => setTiles(getStartTiles());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return tiles;
}

export const NEXT_SIZE: Record<TileSize, TileSize> = { medium: 'small', small: 'wide', wide: 'medium' };
