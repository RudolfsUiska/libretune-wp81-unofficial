import { useChannels } from '../../../stores/realtimeStore';
import { LIMITS, pick, useEngineReadings, type EngineReadings } from '../engineReadings';

/**
 * Readings and rules for the Windows 8.1 dash. The five engine readings and
 * their limits are the shared ones (engineReadings.ts); this adds the extra
 * tiles' channels and turns the limits into tile colours and alerts.
 */

/** Extra channels, first present wins: rusEFI first, then Speeduino. */
export const EXTRA_CHANNELS = {
  iat: ['intake', 'IATValue', 'iat', 'IAT'],
  tps: ['TPSValue', 'tps', 'TPS'],
  speed: ['vehicleSpeedKph', 'VSS', 'vss', 'speed'],
  lambda: ['lambdaValue', 'lambda', 'Lambda'],
  timing: ['timingAdvance', 'ignitionAdvanceCyl1', 'advance', 'ignitionAdvance'],
} as const;

const EXTRA_NAMES: string[] = Object.values(EXTRA_CHANNELS).flat();

export interface Win81Readings extends EngineReadings {
  iat: number | undefined;
  tps: number | undefined;
  speed: number | undefined;
  lambda: number | undefined;
  timing: number | undefined;
}

export function useWin81Readings(isConnected: boolean): Win81Readings {
  const base = useEngineReadings(isConnected);
  const values = useChannels(EXTRA_NAMES);
  const read = (names: readonly string[]) => (isConnected ? pick(values, names) : undefined);
  return {
    ...base,
    iat: read(EXTRA_CHANNELS.iat),
    tps: read(EXTRA_CHANNELS.tps),
    speed: read(EXTRA_CHANNELS.speed),
    lambda: read(EXTRA_CHANNELS.lambda),
    timing: read(EXTRA_CHANNELS.timing),
  };
}

/**
 * What a switchable tile shows. Tapping the tile steps to the next choice and
 * the choice is remembered on this device - the tiles do not change on their
 * own, so a glance always finds the same reading in the same place.
 */
export const TILE_CHOICES = {
  mixture: ['afr', 'lambda'],
  throttle: ['tps', 'advance'],
} as const;

export type TileChoiceKey = keyof typeof TILE_CHOICES;
type Choices = { [K in TileChoiceKey]: (typeof TILE_CHOICES)[K][number] };

const CHOICE_STORAGE_KEY = 'libretune.win81.tiles';

export function loadTileChoices(): Choices {
  const out = { mixture: 'afr', throttle: 'tps' } as Choices;
  try {
    const saved = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    for (const key of Object.keys(TILE_CHOICES) as TileChoiceKey[]) {
      const v = saved[key];
      if ((TILE_CHOICES[key] as readonly unknown[]).includes(v)) (out as Record<string, unknown>)[key] = v;
    }
  } catch {
    // Unreadable or unavailable storage: the defaults stand.
  }
  return out;
}

/** The choices with `key` stepped to its next option (saved). */
export function nextTileChoice(current: Choices, key: TileChoiceKey): Choices {
  const options = TILE_CHOICES[key] as readonly string[];
  const next = options[(options.indexOf(current[key]) + 1) % options.length];
  const out = { ...current, [key]: next } as Choices;
  try {
    localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(out));
  } catch {
    // Storage unavailable: the choice still holds for this session.
  }
  return out;
}

/** 0..1 position of a value in [min, max], clamped; 0 without a value. */
export function fraction(value: number | undefined, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export type TileState = 'normal' | 'alert';

export interface Alert {
  key: string;
  text: string;
}

/**
 * Active alerts, in the order they matter on the road. AFR out of band is not
 * an alert: a lift-off reads lean, so its tile only changes colour.
 */
export function alerts(r: Win81Readings): Alert[] {
  const out: Alert[] = [];
  if (r.rpm !== undefined && r.rpm >= LIMITS.rpm.red) out.push({ key: 'rpm', text: 'over-rev' });
  if (r.coolant !== undefined && r.coolant >= LIMITS.coolant.warn) out.push({ key: 'coolant', text: 'coolant hot' });
  if (r.boost !== undefined && r.boost >= LIMITS.boost.red) out.push({ key: 'boost', text: 'boost high' });
  if (r.battery !== undefined && r.battery < LIMITS.battery.low) out.push({ key: 'battery', text: 'battery low' });
  if (r.battery !== undefined && r.battery > LIMITS.battery.high) out.push({ key: 'battery', text: 'charging high' });
  return out;
}

export function afrOutOfBand(afr: number | undefined): boolean {
  return afr !== undefined && (afr < LIMITS.afr.okLow || afr > LIMITS.afr.okHigh);
}

/** Tile readouts: dashes without a value, Windows-style plain numbers otherwise. */
export const show = {
  rpm: (v: number | undefined) => (v === undefined ? '—' : String(Math.round(v))),
  boost: (v: number | undefined) => (v === undefined ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`),
  temp: (v: number | undefined) => (v === undefined ? '—' : `${Math.round(v)}°`),
  afr: (v: number | undefined) => (v === undefined ? '—' : v.toFixed(1)),
  lambda: (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2)),
  volts: (v: number | undefined) => (v === undefined ? '—' : v.toFixed(1)),
  whole: (v: number | undefined) => (v === undefined ? '—' : String(Math.round(v))),
  timing: (v: number | undefined) => (v === undefined ? '—' : `${v.toFixed(1)}°`),
};

/** The Windows 8 Start-screen tile colours. */
export const TILE_COLORS = {
  green: '#00a300',
  blue: '#2d89ef',
  purple: '#603cba',
  orange: '#da532c',
  teal: '#00aba9',
  darkBlue: '#2b5797',
  magenta: '#9f00a7',
  darkGreen: '#1e7145',
  yellow: '#e3a21a',
  red: '#ee1111',
} as const;
