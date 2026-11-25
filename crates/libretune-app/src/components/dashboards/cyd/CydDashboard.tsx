import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowUp,
  BatteryMedium,
  Droplets,
  Gauge,
  Network,
  Percent,
  Syringe,
  Thermometer,
  Timer,
  Wind,
} from 'lucide-react';
import { show } from '../win81/win81Logic';
import {
  PAGES,
  PAGE_TITLES,
  RINGS,
  TACH,
  arcPath,
  angleAt,
  banner,
  coolantTone,
  gearBox,
  loadPage,
  num,
  polar,
  savePage,
  shiftLight,
  useCydReadings,
  type CydPage,
  type CydReadings,
  type Ring,
} from './cydLogic';
import { useDashSwitches } from './useDashSwitches';
import { CydStatus } from './CydStatus';
import './CydDashboard.css';

/**
 * A car-cluster dash after the look of the ESP32 "Cheap Yellow Display" car
 * dashboard: dark panel, a 270° rev arc in cyan that turns red at the shift
 * point, a 0-8 tick ring with its red zone, the speed big in the middle, a
 * gear / shift-arrow box with the rpm under it, and a reading in each corner.
 * A second page holds six ring gauges, a third the ECU's status lamps. Swipe,
 * or tap the dots, to change page.
 *
 * Original code: the layout was redrawn from the project's screenshots, as
 * SVG and CSS in container units, so it fills any size and stacks in portrait.
 */
export default function CydDashboard({ isConnected }: { isConnected: boolean }) {
  const r = useCydReadings(isConnected);
  const [page, setPage] = useState<CydPage>(loadPage);
  const go = (p: CydPage) => {
    savePage(p);
    setPage(p);
  };
  const index = PAGES.indexOf(page);

  // Horizontal swipe between the pages.
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < PAGES.length) go(PAGES[next]);
  };

  const alert = banner(r);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const showBanner = alert !== null && alert.key !== dismissed;
  const sw = useDashSwitches(isConnected);

  return (
    <div className="cyd-dash" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (start.current = null)}>
      <header className="cyd-top">
        <h1 className="cyd-title">{PAGE_TITLES[page]}</h1>
        <div className="cyd-switches">
          <Switch
            label="LOG"
            on={sw.logging}
            disabled={!sw.canLog}
            tone="rec"
            onToggle={sw.toggleLogging}
          />
          <Switch
            label="AUTOTUNE"
            on={sw.autotune}
            disabled={!sw.canAutotune}
            onToggle={() => void sw.toggleAutotune()}
          />
        </div>
        <div className="cyd-icons">
          {alert && <EngineLamp className="cyd-lamp" />}
          <span className={`cyd-pill${isConnected ? ' live' : ''}`}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          <Network className={`cyd-net${isConnected ? ' on' : ''}`} aria-label={isConnected ? 'ecu connected' : 'ecu offline'} />
          <Clock />
        </div>
      </header>

      {showBanner && (
        <div className="cyd-banner" role="alert" onClick={() => setDismissed(alert.key)}>
          <EngineLamp className="cyd-banner-icon" />
          <div className="cyd-banner-text">
            <b>{alert.title}</b>
            <span>{alert.detail}</span>
          </div>
        </div>
      )}

      <div className="cyd-viewport">
        <div className="cyd-pages" style={{ transform: `translateX(${-index * 100}%)` }}>
          <section className="cyd-page" aria-hidden={page !== 'cluster'}>
            <Cluster r={r} />
          </section>
          <section className="cyd-page" aria-hidden={page !== 'engine'}>
            <div className="cyd-rings">
              {RINGS.map((ring) => (
                <RingGauge key={ring.key} ring={ring} r={r} />
              ))}
            </div>
          </section>
          <section className="cyd-page" aria-hidden={page !== 'status'}>
            <CydStatus isConnected={isConnected} />
          </section>
        </div>
      </div>

      <nav className="cyd-dots" aria-label="dashboard page">
        {PAGES.map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? 'on' : ''}
            aria-label={`${p} page`}
            aria-pressed={p === page}
            onClick={() => go(p)}
          />
        ))}
      </nav>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return <span className="cyd-clock">{`${hh}:${mm}`}</span>;
}

/** A top-bar toggle: label and a sliding knob. `rec` turns red with a pulsing dot. */
function Switch(props: { label: string; on: boolean; disabled?: boolean; tone?: 'rec'; onToggle: () => void }) {
  const { label, on, disabled, tone, onToggle } = props;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label.toLowerCase()}
      disabled={disabled}
      className={`cyd-switch${on ? ' on' : ''}${tone ? ` ${tone}` : ''}`}
      // Don't let a tap here start a page swipe.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={onToggle}
    >
      <span className="cyd-switch-label">{label}</span>
      <span className="cyd-switch-track">
        <span className="cyd-switch-knob" />
      </span>
    </button>
  );
}

/** A plain engine pictogram for the check-engine lamp. */
function EngineLamp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 6h6v2h-2v1h4l2 2h1v-2h3v8h-3v-2h-1l-2 3H9l-2-2H5v2H3V9h2v2h1V9h3V8H7z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------- page 1 */

function Cluster({ r }: { r: CydReadings }) {
  const box = gearBox(r);
  const hasSpeed = r.speed !== undefined;
  return (
    <div className="cyd-cluster">
      <Stat
        area="tl"
        value={show.whole(r.coolant).replace('—', '--')}
        unit="°C"
        label="coolant"
        icon={<Thermometer />}
        tone={coolantTone(r.coolant)}
      />
      <Stat area="tr" value={num(r.battery, 1)} unit="V" label="battery" icon={<BatteryMedium />} right />
      <Stat area="bl" value={num(r.afr, 1)} unit="" label="afr" icon={<Droplets />} />
      <Stat
        area="br"
        value={r.iat === undefined ? '--' : String(Math.round(r.iat))}
        unit="°C"
        label="intake"
        icon={<Wind />}
        right
      />

      <div className="cyd-gauge">
        <Tach r={r} />
        <div className="cyd-gauge-row">
          <span className={`cyd-gear ${box.kind}`} aria-label={box.kind === 'shift' ? 'shift up' : `gear ${box.text}`}>
            {box.kind === 'shift' ? <ArrowUp strokeWidth={3} /> : box.text}
          </span>
          {hasSpeed ? (
            <span className="cyd-rpm">
              {r.rpm === undefined ? '--' : Math.round(r.rpm)} <small>rpm</small>
            </span>
          ) : (
            <span className="cyd-rpm">
              {show.boost(r.boost).replace('—', '--')} <small>bar</small>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat(props: {
  area: string;
  value: string;
  unit: string;
  label: string;
  icon: ReactNode;
  tone?: 'cold' | 'ok' | 'hot';
  right?: boolean;
}) {
  const { area, value, unit, label, icon, tone = 'ok', right } = props;
  return (
    <div className={`cyd-stat cyd-${area}${right ? ' right' : ''} ${tone}`} aria-label={label}>
      <div className="cyd-stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="cyd-stat-label">
        {icon}
        {label}
      </div>
    </div>
  );
}

/** The rev arc and tick ring. Speed in the middle when the ECU has it, else rpm. */
function Tach({ r }: { r: CydReadings }) {
  const C = 120;
  const f = r.rpm === undefined ? 0 : (r.rpm - TACH.min) / (TACH.max - TACH.min);
  const redF = (TACH.red - TACH.min) / (TACH.max - TACH.min);
  const shift = shiftLight(r.rpm);
  const steps = 40; // a tick every 200 rpm, numbered every 1000
  const center = r.speed !== undefined ? { v: show.whole(r.speed), unit: 'km/h', big: true } : { v: show.rpm(r.rpm), unit: 'rpm', big: false };

  return (
    <svg className="cyd-tach" viewBox="0 0 240 240" role="img" aria-label={`engine speed ${r.rpm === undefined ? 'unknown' : Math.round(r.rpm)} rpm`}>
      <path className="cyd-track" d={arcPath(C, C, 106, 0, 1)} />
      <path className={`cyd-fill${shift ? ' shift' : ''}`} d={arcPath(C, C, 106, 0, f)} />
      <path className="cyd-redzone" d={arcPath(C, C, 92, redF, 1)} />
      {Array.from({ length: steps + 1 }, (_, i) => {
        const major = i % 5 === 0;
        const a = angleAt(i / steps);
        const [x0, y0] = polar(C, C, 88, a);
        const [x1, y1] = polar(C, C, major ? 76 : 82, a);
        const red = (i / steps) * (TACH.max - TACH.min) + TACH.min >= TACH.red;
        return (
          <line key={i} className={`cyd-tick${major ? ' major' : ''}${red ? ' red' : ''}`} x1={x0} y1={y0} x2={x1} y2={y1} />
        );
      })}
      {Array.from({ length: 9 }, (_, k) => {
        const [x, y] = polar(C, C, 64, angleAt(k / 8));
        const red = k * 1000 >= TACH.red;
        return (
          <text key={k} className={`cyd-num${red ? ' red' : ''}`} x={x} y={y}>
            {k}
          </text>
        );
      })}
      <text className={`cyd-center${center.big ? '' : ' small'}`} x={C} y={center.big ? 124 : 122}>
        {center.v === '—' ? '--' : center.v}
      </text>
      <text className="cyd-center-unit" x={C} y={170}>
        {center.unit}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------- page 2 */

const RING_ICONS: Record<string, ReactNode> = {
  tps: <Percent />,
  map: <Gauge />,
  afr: <Droplets />,
  iat: <Thermometer />,
  timing: <Timer />,
  duty: <Syringe />,
};

function RingGauge({ ring, r }: { ring: Ring; r: CydReadings }) {
  const v = ring.value(r);
  const f = v === undefined ? 0 : (v - ring.min) / (ring.max - ring.min);
  return (
    <div className="cyd-ring" aria-label={ring.label}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path className="cyd-track" d={arcPath(60, 60, 50, 0, 1)} />
        <path className="cyd-fill" d={arcPath(60, 60, 50, 0, f)} />
        <text className="cyd-ring-value" x={60} y={60}>
          {num(v, ring.digits)}
        </text>
        <text className="cyd-ring-unit" x={60} y={84}>
          {ring.unit}
        </text>
      </svg>
      <div className="cyd-ring-label">
        {RING_ICONS[ring.key] ?? <Activity />}
        {ring.label}
      </div>
    </div>
  );
}
