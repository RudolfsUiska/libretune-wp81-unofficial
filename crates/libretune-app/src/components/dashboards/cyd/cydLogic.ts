import { useChannels } from '../../../stores/realtimeStore';
import { CHANNELS, LIMITS, pick } from '../engineReadings';
import { alerts, useWin81Readings, type Win81Readings } from '../win81/win81Logic';

/**
 * Readings and rules for the CYD cluster dash, a car-cluster layout after the
 * look of the ESP32 "Cheap Yellow Display" car dashboard (see the README note
 * in WINDOWS_PHONE_UI.md: the design was redrawn here, no code or assets
 * were taken). Engine readings and alerts are the shared ones; this adds the
 * channels the cluster's extra page needs.
 */

/** Extra channels, first present wins: rusEFI first, then Speeduino. */
export const CYD_CHANNELS = {
  gear: ['detectedGear', 'tcuCurrentGear', 'gear'],
  duty: ['injectorDutyCycle', 'dutyCycle', 'DutyCycle'],
} as const;

const CYD_NAMES: string[] = [...Object.values(CYD_CHANNELS).flat(), ...CHANNELS.map];

export interface CydReadings extends Win81Readings {
  gear: number | undefined;
  duty: number | undefined;
  /** Absolute manifold pressure in bar. */
  mapBar: number | undefined;
}

export function useCydReadings(isConnected: boolean): CydReadings {
  const base = useWin81Readings(isConnected);
  const values = useChannels(CYD_NAMES);
  const read = (names: readonly string[]) => (isConnected ? pick(values, names) : undefined);
  const map = read(CHANNELS.map);
  return {
    ...base,
    gear: read(CYD_CHANNELS.gear),
    duty: read(CYD_CHANNELS.duty),
    mapBar: map === undefined ? undefined : map / 100,
  };
}

/** The cluster's main gauge: 0..8000 rpm with the red zone from the shared limit. */
export const TACH = { min: LIMITS.rpm.min, max: LIMITS.rpm.max, red: LIMITS.rpm.red } as const;

/** The arc colour and the shift arrow come on here, as on the original's shift light. */
export const SHIFT_RPM = LIMITS.rpm.red - 500;

export const shiftLight = (rpm: number | undefined) => rpm !== undefined && rpm >= SHIFT_RPM;

/** What the box under the speed says: shift arrow, the gear, N, or a dash. */
export function gearBox(r: CydReadings): { kind: 'shift' | 'gear'; text: string } {
  if (shiftLight(r.rpm)) return { kind: 'shift', text: '↑' };
  if (r.gear === undefined) return { kind: 'gear', text: '–' };
  const g = Math.round(r.gear);
  if (g < 0) return { kind: 'gear', text: 'R' };
  return { kind: 'gear', text: g === 0 ? 'N' : String(g) };
}

/** Coolant is drawn in the accent while cold, white when warm, red when hot. */
export function coolantTone(c: number | undefined): 'cold' | 'ok' | 'hot' {
  if (c === undefined) return 'ok';
  if (c >= LIMITS.coolant.warn) return 'hot';
  if (c < 60) return 'cold';
  return 'ok';
}

/** Gauges on the second page, three by two. */
export interface Ring {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  value: (r: CydReadings) => number | undefined;
  digits: number;
}

export const RINGS: Ring[] = [
  { key: 'tps', label: 'throttle', unit: '%', min: 0, max: 100, value: (r) => r.tps, digits: 0 },
  { key: 'map', label: 'map', unit: 'bar', min: 0, max: 3, value: (r) => r.mapBar, digits: 2 },
  { key: 'afr', label: 'afr', unit: 'afr', min: 10, max: 20, value: (r) => r.afr, digits: 1 },
  { key: 'iat', label: 'intake', unit: '°C', min: -20, max: 80, value: (r) => r.iat, digits: 0 },
  { key: 'timing', label: 'timing', unit: '°', min: -10, max: 50, value: (r) => r.timing, digits: 1 },
  { key: 'duty', label: 'inj duty', unit: '%', min: 0, max: 100, value: (r) => r.duty, digits: 0 },
];

export const num = (v: number | undefined, digits: number) => (v === undefined ? '--' : v.toFixed(digits));

/* ----------------------------------------------------------- geometry */

/** The gauges sweep 270°, from bottom-left through the top to bottom-right. */
export const SWEEP = 270;
const START = -SWEEP / 2;

/** Degrees clockwise from 12 o'clock for a 0..1 position on the sweep. */
export const angleAt = (f: number) => START + SWEEP * Math.max(0, Math.min(1, f));

export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

/** SVG path for the arc between two sweep positions (0..1). Empty when it has no length. */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a0 = angleAt(from);
  const a1 = angleAt(to);
  if (a1 - a0 < 0.01) return '';
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/* -------------------------------------------------------------- pages */

export type CydPage = 'cluster' | 'engine' | 'status';
export const PAGES: CydPage[] = ['cluster', 'engine', 'status'];
export const PAGE_TITLES: Record<CydPage, string> = {
  cluster: 'Šķieneru Sniegums',
  engine: 'Engine',
  status: 'Status',
};

/* ------------------------------------------------------------ status lamps */

/** One ECU status lamp, as the INI's [FrontPage] `indicator` lines give it. */
export interface StatusLamp {
  expression: string;
  label_off: string;
  label_on: string;
  bg_off: string;
  fg_off: string;
  bg_on: string;
  fg_on: string;
}

/**
 * Colour for a lit lamp. The INI's "on" colour when it says something
 * (red for an error, green for OK...); white or black, which many INIs use
 * as plain "on", becomes the dash's cyan.
 */
export function lampColor(bgOn: string): string {
  const c = bgOn.trim().toLowerCase();
  if (!c || /^(white|black|#fff(fff)?|#000(000)?|rgb\(\s*(255,\s*255,\s*255|0,\s*0,\s*0)\s*\))$/.test(c)) {
    return 'var(--cyd-accent)';
  }
  return bgOn;
}

/** True when a lamp's "on" state is a warning (red/orange), for sorting and tone. */
export function lampIsAlarm(bgOn: string): boolean {
  const c = bgOn.trim().toLowerCase();
  if (c === 'red' || c === 'orange') return true;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(c) ?? /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (!m) return false;
  const [r, g, b] = m.slice(1, 4).map((v) => (c.startsWith('rgb') ? Number(v) : parseInt(v, 16)));
  return r > 180 && g < 140 && b < 120;
}
const PAGE_KEY = 'libretune.cyd.page';

export function loadPage(): CydPage {
  try {
    const v = localStorage.getItem(PAGE_KEY);
    if (PAGES.includes(v as CydPage)) return v as CydPage;
  } catch {
    // Storage unavailable: start on the cluster.
  }
  return 'cluster';
}

export function savePage(p: CydPage): void {
  try {
    localStorage.setItem(PAGE_KEY, p);
  } catch {
    // Storage unavailable: the page still holds for this session.
  }
}

/* ------------------------------------------------------------- alerts */

const ALERT_TEXT: Record<string, { title: string; detail: string }> = {
  rpm: { title: 'Over-rev', detail: 'Engine speed is past the red line' },
  coolant: { title: 'Coolant hot', detail: 'Ease off and watch the temperature' },
  boost: { title: 'Boost high', detail: 'Manifold pressure is over the limit' },
  battery: { title: 'Charging fault', detail: 'Battery voltage is out of range' },
};

/** The banner's text: the most important alert, and how many more there are. */
export function banner(r: CydReadings): { key: string; title: string; detail: string } | null {
  const list = alerts(r);
  if (list.length === 0) return null;
  const first = list[0];
  const text = ALERT_TEXT[first.key] ?? { title: first.text, detail: '' };
  const more = list.length > 1 ? ` · +${list.length - 1} more` : '';
  return { key: list.map((a) => a.key + a.text).join('|'), title: text.title, detail: text.detail + more };
}
