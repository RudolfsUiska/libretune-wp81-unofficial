import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Activity, BatteryMedium, Gauge, Thermometer, Wind, Cable, Unplug } from 'lucide-react';
import { getChannelHistoryBuffer } from '../../../stores/realtimeStore';
import { CHANNELS, LIMITS } from '../engineReadings';
import {
  TILE_COLORS,
  afrOutOfBand,
  alerts,
  fraction,
  show,
  useWin81Readings,
  type Win81Readings,
} from './win81Logic';
import './Win81Dashboard.css';

/**
 * Engine dash in the style of the Windows 8.1 Start screen: a big "Engine"
 * title, the clock and an account-style status tile top right, and a grid of
 * live tiles in the Windows 8 tile colours. A tile turns red when its reading
 * crosses a limit (engineReadings.ts LIMITS), and the status tile counts the
 * alerts. The background follows the app's accent, as the Start screen
 * followed the personalisation colour.
 *
 * Plain DOM/CSS in container units, so it fills any size and switches to a
 * tall layout in portrait.
 */
export default function Win81Dashboard({ isConnected }: { isConnected: boolean }) {
  const r = useWin81Readings(isConnected);
  const active = alerts(r);
  const alerted = new Set(active.map((a) => a.key));
  const color = (key: string, normal: string) => (alerted.has(key) ? TILE_COLORS.red : normal);

  return (
    <div className="w81-dash">
      <header className="w81-head">
        <h1 className="w81-title">Engine</h1>
        <div className="w81-account">
          <Clock />
          <div className="w81-user">
            <span className="w81-user-name">{isConnected ? 'online' : 'offline'}</span>
            <span className="w81-user-sub">
              {active.length > 0 ? active.map((a) => a.text).join(' · ') : isConnected ? 'all clear' : 'no ecu link'}
            </span>
          </div>
          <span className={`w81-avatar${active.length ? ' alert' : ''}`}>
            {isConnected ? <Cable strokeWidth={1.6} /> : <Unplug strokeWidth={1.6} />}
            {active.length > 0 && <b className="w81-badge">{active.length}</b>}
          </span>
        </div>
      </header>

      <div className="w81-grid">
        <RpmTile r={r} color={color('rpm', TILE_COLORS.green)} />

        <Tile area="b" i={1} color={color('boost', TILE_COLORS.blue)} label="boost" icon={<Wind />}>
          <div className="w81-wide">
            <div className="w81-value">
              {show.boost(r.boost)}
              <small>bar</small>
            </div>
            <CenterBar value={r.boost} min={LIMITS.boost.min} max={LIMITS.boost.max} red={LIMITS.boost.red} />
          </div>
        </Tile>

        <Tile
          area="a"
          i={2}
          color={afrOutOfBand(r.afr) ? TILE_COLORS.orange : TILE_COLORS.purple}
          label={r.lambda !== undefined ? 'mixture' : 'afr'}
          peek={
            r.lambda !== undefined ? (
              <div className="w81-medium">
                <div className="w81-value">{show.lambda(r.lambda)}</div>
                <div className="w81-caption">lambda</div>
              </div>
            ) : undefined
          }
        >
          <div className="w81-medium">
            <div className="w81-value">{show.afr(r.afr)}</div>
            <div className="w81-caption">afr</div>
          </div>
        </Tile>

        <Tile area="c" i={3} color={color('coolant', TILE_COLORS.orange)} label="coolant" icon={<Thermometer />}>
          <div className="w81-medium w81-with-bar">
            <div className="w81-value">{show.temp(r.coolant)}</div>
            <VerticalBar value={fraction(r.coolant, LIMITS.coolant.min, LIMITS.coolant.max)} />
          </div>
        </Tile>

        <Tile area="v" i={4} color={color('battery', TILE_COLORS.teal)} small icon={<BatteryMedium />}>
          <SmallValue text={show.volts(r.battery)} unit="v" />
        </Tile>
        <Tile area="s" i={5} color={TILE_COLORS.darkGreen} small icon={<Gauge />}>
          <SmallValue text={show.whole(r.speed)} unit="km/h" />
        </Tile>
        <Tile area="i" i={6} color={TILE_COLORS.darkBlue} small icon={<Thermometer />}>
          <SmallValue text={show.temp(r.iat)} unit="iat" />
        </Tile>
        <Tile area="t" i={7} color={TILE_COLORS.magenta} small icon={<Activity />}>
          <SmallValue text={r.tps === undefined ? '—' : `${Math.round(r.tps)}%`} unit="tps" />
        </Tile>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w81-clock">
      <span className="w81-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <span className="w81-date">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span>
    </div>
  );
}

interface TileProps {
  area: string;
  /** Entrance order: tiles slide in from the right one after another. */
  i: number;
  color: string;
  label?: string;
  icon?: ReactNode;
  small?: boolean;
  /** Second face: the tile peeks up to it and back, like a live tile. */
  peek?: ReactNode;
  children: ReactNode;
}

function Tile({ area, i, color, label, icon, small, peek, children }: TileProps) {
  const style = { gridArea: area, background: color, '--i': i } as CSSProperties;
  return (
    <section className={`w81-tile${small ? ' w81-small' : ''}`} style={style} aria-label={label}>
      <div className={`w81-faces${peek ? ' w81-peeking' : ''}`}>
        <div className="w81-face">{children}</div>
        {peek && <div className="w81-face">{peek}</div>}
      </div>
      {!small && label && <span className="w81-label">{label}</span>}
      {!small && icon && <span className="w81-icon">{icon}</span>}
      {small && icon && <span className="w81-small-icon">{icon}</span>}
    </section>
  );
}

function SmallValue({ text, unit }: { text: string; unit: string }) {
  return (
    <div className="w81-small-body">
      <div className="w81-value">{text}</div>
      <div className="w81-caption">{unit}</div>
    </div>
  );
}

/** Large RPM tile: the number, advance, the recent history, and a meter. */
function RpmTile({ r, color }: { r: Win81Readings; color: string }) {
  const segments = 24;
  const lit = Math.round(fraction(r.rpm, LIMITS.rpm.min, LIMITS.rpm.max) * segments);
  const redFrom = Math.ceil(fraction(LIMITS.rpm.red, LIMITS.rpm.min, LIMITS.rpm.max) * segments);
  return (
    <Tile area="r" i={0} color={color} label="engine speed" icon={<Gauge />}>
      <div className="w81-large">
        <Sparkline />
        <div className="w81-value w81-huge">{show.rpm(r.rpm)}</div>
        <div className="w81-caption">
          rpm{r.timing !== undefined ? ` · advance ${show.timing(r.timing)}` : ''}
        </div>
        <div className="w81-meter" aria-hidden="true">
          {Array.from({ length: segments }, (_, k) => (
            <span key={k} className={`${k < lit ? 'lit' : ''}${k >= redFrom ? ' red' : ''}`} />
          ))}
        </div>
      </div>
    </Tile>
  );
}

/** The last ~15 s of RPM, drawn faintly behind the number. */
function Sparkline() {
  const name = CHANNELS.rpm.find((n) => getChannelHistoryBuffer(n).length > 1);
  const hist = name ? getChannelHistoryBuffer(name).slice(-150) : [];
  if (hist.length < 2) return null;
  const max = Math.max(LIMITS.rpm.max, ...hist);
  const pts = hist.map((v, k) => `${((k / (hist.length - 1)) * 100).toFixed(2)},${(100 - (v / max) * 100).toFixed(2)}`);
  return (
    <svg className="w81-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,100 ${pts.join(' ')} 100,100`} />
      <polyline points={pts.join(' ')} />
    </svg>
  );
}

/** Boost meter: fills left or right of zero (vacuum / boost). */
function CenterBar({ value, min, max, red }: { value: number | undefined; min: number; max: number; red: number }) {
  const zero = fraction(0, min, max);
  const pos = fraction(value, min, max);
  const left = Math.min(zero, pos);
  const width = Math.abs(pos - zero);
  return (
    <div className="w81-hbar" aria-hidden="true">
      <span className="w81-hbar-fill" style={{ left: `${left * 100}%`, width: `${value === undefined ? 0 : width * 100}%` }} />
      <span className="w81-hbar-zero" style={{ left: `${zero * 100}%` }} />
      <span className="w81-hbar-red" style={{ left: `${fraction(red, min, max) * 100}%` }} />
    </div>
  );
}

function VerticalBar({ value }: { value: number }) {
  return (
    <div className="w81-vbar" aria-hidden="true">
      <span style={{ height: `${value * 100}%` }} />
    </div>
  );
}
