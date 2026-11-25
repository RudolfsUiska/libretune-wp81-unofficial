import { CHANNELS, LIMITS, STANDARD_BARO_KPA } from '../engineReadings';
import { afrOutOfBand, alerts, show, type Win81Readings } from '../win81/win81Logic';

/**
 * Readings and rules for the Zune dash. It reads the same channels as the
 * Windows 8.1 dash (useWin81Readings) and shares its alert rules; this file
 * describes the "tracks": which readings can be featured as the now-playing
 * item, their meter ranges, and how they are written.
 */

export type ZuneReadings = Win81Readings;

export type FeatureKey = 'rpm' | 'boost' | 'afr' | 'coolant' | 'battery';

export interface Feature {
  key: FeatureKey;
  /** Pivot header word, lowercase as on the Zune. */
  pivot: string;
  /** Now-playing title. */
  title: string;
  unit: string;
  min: number;
  max: number;
  /** Where the meter's red mark sits, if the reading has one. */
  red?: number;
  value: (r: ZuneReadings) => number | undefined;
  text: (r: ZuneReadings) => string;
  /** Channels whose history is drawn behind the value, and how to convert it. */
  history: { names: readonly string[]; map?: (v: number) => number };
  /** Meter end labels. */
  ends: [string, string];
}

/** Pivot order. Tapping a word (or a row in the list) features that reading. */
export const FEATURES: Feature[] = [
  {
    key: 'rpm',
    pivot: 'engine',
    title: 'engine speed',
    unit: 'rpm',
    ...LIMITS.rpm,
    value: (r) => r.rpm,
    text: (r) => show.rpm(r.rpm),
    history: { names: CHANNELS.rpm },
    ends: ['0', String(LIMITS.rpm.max)],
  },
  {
    key: 'boost',
    pivot: 'boost',
    title: 'boost pressure',
    unit: 'bar',
    ...LIMITS.boost,
    value: (r) => r.boost,
    text: (r) => show.boost(r.boost),
    // History is MAP; the standard atmosphere is close enough for a trace.
    history: { names: CHANNELS.map, map: (kpa) => (kpa - STANDARD_BARO_KPA) / 100 },
    ends: ['−1', '+2'],
  },
  {
    key: 'afr',
    pivot: 'mixture',
    title: 'air fuel ratio',
    unit: 'afr',
    min: LIMITS.afr.min,
    max: LIMITS.afr.max,
    value: (r) => r.afr,
    text: (r) => show.afr(r.afr),
    history: { names: CHANNELS.afr },
    ends: ['rich', 'lean'],
  },
  {
    key: 'coolant',
    pivot: 'coolant',
    title: 'coolant temperature',
    unit: '°c',
    min: LIMITS.coolant.min,
    max: LIMITS.coolant.max,
    red: LIMITS.coolant.warn,
    value: (r) => r.coolant,
    text: (r) => (r.coolant === undefined ? '—' : String(Math.round(r.coolant))),
    history: { names: CHANNELS.coolant },
    ends: [`${LIMITS.coolant.min}°`, `${LIMITS.coolant.max}°`],
  },
  {
    key: 'battery',
    pivot: 'battery',
    title: 'battery voltage',
    unit: 'v',
    min: LIMITS.battery.min,
    max: LIMITS.battery.max,
    value: (r) => r.battery,
    text: (r) => show.volts(r.battery),
    history: { names: CHANNELS.battery },
    ends: [`${LIMITS.battery.min} v`, `${LIMITS.battery.max} v`],
  },
];

export const featureOf = (key: FeatureKey): Feature => FEATURES.find((f) => f.key === key) ?? FEATURES[0];

/**
 * Pivot words starting at the featured one, as the Zune pivot rotated the
 * selected heading to the left edge and let the rest run off the right.
 */
export function pivotOrder(key: FeatureKey): Feature[] {
  const i = Math.max(0, FEATURES.findIndex((f) => f.key === key));
  return [...FEATURES.slice(i), ...FEATURES.slice(0, i)];
}

export type FeatureState = 'normal' | 'caution' | 'alert';

/** Alert from the shared limits; AFR out of band is only a caution (lift-off reads lean). */
export function featureState(key: FeatureKey, r: ZuneReadings): FeatureState {
  if (alerts(r).some((a) => a.key === key)) return 'alert';
  if (key === 'afr' && afrOutOfBand(r.afr)) return 'caution';
  return 'normal';
}

/** Readings that only appear in the list, never featured. */
export const EXTRAS: { key: string; label: string; text: (r: ZuneReadings) => string; unit: string }[] = [
  { key: 'speed', label: 'speed', text: (r) => show.whole(r.speed), unit: 'km/h' },
  { key: 'iat', label: 'intake air', text: (r) => show.temp(r.iat), unit: '' },
  { key: 'tps', label: 'throttle', text: (r) => (r.tps === undefined ? '—' : `${Math.round(r.tps)}%`), unit: '' },
  { key: 'timing', label: 'advance', text: (r) => show.timing(r.timing), unit: '' },
];

const STORAGE_KEY = 'libretune.zune.featured';

export function loadFeatured(): FeatureKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (FEATURES.some((f) => f.key === saved)) return saved as FeatureKey;
  } catch {
    // Storage unavailable: start on engine speed.
  }
  return 'rpm';
}

export function saveFeatured(key: FeatureKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage unavailable: the choice still holds for this session.
  }
}

/** The Zune palette: the logo's magenta-to-orange, and grey for what isn't selected. */
export const ZUNE = {
  magenta: '#ec008c',
  orange: '#f47b20',
  red: '#e51400',
  grey: '#5c5c5c',
} as const;
