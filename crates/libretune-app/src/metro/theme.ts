import { useEffect, useState } from 'react';

/**
 * Windows Phone "start+theme": a background theme plus an accent colour.
 * Stored per device, like the old UI scale.
 *
 * The backgrounds are LibreTune's nine themes (dark, light, midnight, carbon,
 * synthwave, solarized, nord, dracula, high contrast), each drawn as a Metro
 * palette in metro.css. The accent is one of the twenty WP accents, or
 * "theme", the theme's own. LibreTune's theme picker (Settings > Appearance)
 * and the start+theme page both write this, through the ThemeProvider.
 *
 * `index.html` reads the same storage key before first paint, so the app
 * never flashes the wrong colours; keep THEME_ACCENTS in step with it.
 */

export const ACCENTS = [
  { name: 'lime', hex: '#A4C400' },
  { name: 'green', hex: '#60A917' },
  { name: 'emerald', hex: '#008A00' },
  { name: 'teal', hex: '#00ABA9' },
  { name: 'cyan', hex: '#1BA1E2' },
  { name: 'cobalt', hex: '#0050EF' },
  { name: 'indigo', hex: '#6A00FF' },
  { name: 'violet', hex: '#AA00FF' },
  { name: 'pink', hex: '#F472D0' },
  { name: 'magenta', hex: '#D80073' },
  { name: 'crimson', hex: '#A20025' },
  { name: 'red', hex: '#E51400' },
  { name: 'orange', hex: '#FA6800' },
  { name: 'amber', hex: '#F0A30A' },
  { name: 'yellow', hex: '#E3C800' },
  { name: 'brown', hex: '#825A2C' },
  { name: 'olive', hex: '#6D8764' },
  { name: 'steel', hex: '#647687' },
  { name: 'mauve', hex: '#76608A' },
  { name: 'taupe', hex: '#87794E' },
] as const;

export type AccentName = (typeof ACCENTS)[number]['name'] | 'theme';

export const THEMES = [
  'dark',
  'light',
  'midnight',
  'carbon',
  'synthwave',
  'solarized',
  'nord',
  'dracula',
  'highcontrast',
] as const;

export type MetroBackground = (typeof THEMES)[number];

/** Each theme's own accent (used when the accent is "theme"), and preview colours. */
export const THEME_LOOK: Record<MetroBackground, { label: string; accent: string; bg: string; fg: string }> = {
  dark: { label: 'dark', accent: '#0050EF', bg: '#000000', fg: '#ffffff' },
  light: { label: 'light', accent: '#0050EF', bg: '#ffffff', fg: '#000000' },
  midnight: { label: 'midnight', accent: '#2EA043', bg: '#0a0e14', fg: '#e6edf3' },
  carbon: { label: 'carbon', accent: '#0F62FE', bg: '#000000', fg: '#f4f4f4' },
  synthwave: { label: 'synthwave', accent: '#FF2BD6', bg: '#1a1a2e', fg: '#f8f8ff' },
  solarized: { label: 'solarized', accent: '#B58900', bg: '#002b36', fg: '#eee8d5' },
  nord: { label: 'nord', accent: '#5E81AC', bg: '#2e3440', fg: '#eceff4' },
  dracula: { label: 'dracula', accent: '#9D6CF0', bg: '#282a36', fg: '#f8f8f2' },
  highcontrast: { label: 'high contrast', accent: '#FFFF00', bg: '#000000', fg: '#ffffff' },
};

/** Layout width divisor: below 1 fits more on screen, above 1 makes it larger. */
export const DENSITIES = [
  { value: 1.15, label: 'larger' },
  { value: 1, label: 'normal' },
  { value: 0.85, label: 'more content' },
  { value: 0.72, label: 'most content' },
] as const;

export interface MetroPrefs {
  background: MetroBackground;
  accent: AccentName;
  /** "Show more tiles": six columns of small tiles instead of four. */
  moreTiles: boolean;
  density: number;
}

const STORAGE_KEY = 'libretune.metro';
const CHANGE_EVENT = 'libretune:metro';

const DEFAULTS: MetroPrefs = { background: 'dark', accent: 'cobalt', moreTiles: false, density: 1 };

declare global {
  interface Window {
    __applyMetroDensity?: () => void;
  }
}

export function isMetroBackground(v: unknown): v is MetroBackground {
  return (THEMES as readonly unknown[]).includes(v);
}

export function getMetroPrefs(): MetroPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<MetroPrefs>;
    return {
      background: isMetroBackground(raw.background) ? raw.background : DEFAULTS.background,
      accent:
        raw.accent === 'theme' || ACCENTS.some((a) => a.name === raw.accent)
          ? (raw.accent as AccentName)
          : DEFAULTS.accent,
      moreTiles: !!raw.moreTiles,
      density: DENSITIES.some((d) => d.value === raw.density) ? (raw.density as number) : DEFAULTS.density,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** The accent colour in effect: a WP accent, or the theme's own. */
export function accentHex(name: AccentName, background: MetroBackground = getMetroPrefs().background): string {
  if (name === 'theme') return THEME_LOOK[background].accent;
  return ACCENTS.find((a) => a.name === name)?.hex ?? '#0050EF';
}

/** Readable text on the accent: black on the pale ones, white otherwise. */
export function onAccent(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Relative luminance, sRGB approximation; WP kept white text on all its
  // accents, so only the genuinely pale theme accents (high contrast yellow)
  // flip to black.
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.72 ? '#000000' : '#ffffff';
}

/** Writes the prefs onto <html>: data-metro/data-theme, --wp-accent. */
export function applyMetroPrefs(p: MetroPrefs = getMetroPrefs()): void {
  const root = document.documentElement;
  root.setAttribute('data-metro', p.background);
  root.setAttribute('data-theme', p.background);
  const hex = accentHex(p.accent, p.background);
  root.style.setProperty('--wp-accent', hex);
  root.style.setProperty('--wp-on-accent', onAccent(hex));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_LOOK[p.background].bg);
}

export function setMetroPrefs(patch: Partial<MetroPrefs>): void {
  const next = { ...getMetroPrefs(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: applies for this session only.
  }
  applyMetroPrefs(next);
  if (patch.density !== undefined) window.__applyMetroDensity?.();
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Switch theme. A new theme brings its own accent, as choosing a theme in
 * LibreTune always did; pick a WP accent afterwards to override it.
 */
export function setMetroTheme(background: MetroBackground): void {
  const current = getMetroPrefs();
  if (current.background === background) return;
  setMetroPrefs({ background, accent: 'theme' });
}

export function useMetroPrefs(): MetroPrefs {
  const [prefs, setPrefs] = useState(getMetroPrefs);
  useEffect(() => {
    const on = () => setPrefs(getMetroPrefs());
    window.addEventListener(CHANGE_EVENT, on);
    return () => window.removeEventListener(CHANGE_EVENT, on);
  }, []);
  return prefs;
}
