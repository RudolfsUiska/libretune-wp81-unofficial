import { useEffect, useState } from 'react';
import { getChannelHistoryBuffer } from '../../../stores/realtimeStore';
import { alerts, fraction, useWin81Readings } from '../win81/win81Logic';
import {
  EXTRAS,
  FEATURES,
  featureOf,
  featureState,
  loadFeatured,
  pivotOrder,
  saveFeatured,
  type Feature,
  type FeatureKey,
  type ZuneReadings,
} from './zuneLogic';
import './ZuneDashboard.css';

/**
 * Engine dash in the style of the Zune HD "now playing" screen and the Zune
 * desktop software: black, huge lowercase pivot words running off the right
 * edge, the featured reading as square "album art" in the Zune magenta-to-
 * orange, the same reading drifting in giant faint type behind everything,
 * the other readings as a track list, and a thin progress line as its meter.
 *
 * Tapping a pivot word or a list row features that reading; the choice is
 * remembered on this device. Nothing changes on its own: an alert turns the
 * art and the row red, it does not steal the screen.
 *
 * Plain DOM/CSS in container units, so it fills any size and stacks in portrait.
 */
export default function ZuneDashboard({ isConnected }: { isConnected: boolean }) {
  const r = useWin81Readings(isConnected);
  const [featured, setFeatured] = useState<FeatureKey>(loadFeatured);
  const feature = featureOf(featured);
  const state = featureState(featured, r);
  const active = alerts(r);

  const choose = (key: FeatureKey) => {
    saveFeatured(key);
    setFeatured(key);
  };

  const valueText = feature.text(r);
  const status = !isConnected
    ? 'no ecu link'
    : active.length > 0
      ? active.map((a) => a.text).join(' · ')
      : 'all clear';

  return (
    <div className={`zn-dash zn-${state}`}>
      <div className="zn-backdrop" aria-hidden="true">
        <span key={featured}>
          {valueText} {feature.unit}
        </span>
      </div>

      <header className="zn-top">
        <span className="zn-brand">libretune</span>
        <span className="zn-status">
          <span className={`zn-link${isConnected ? ' on' : ''}`} />
          {isConnected ? 'online' : 'offline'}
          <Clock />
        </span>
      </header>

      <nav className="zn-pivot" aria-label="featured reading">
        <div className="zn-pivot-track" key={featured}>
          {pivotOrder(featured).map((f) => (
            <button
              key={f.key}
              type="button"
              className={`zn-pivot-item${f.key === featured ? ' current' : ''}`}
              aria-pressed={f.key === featured}
              onClick={() => choose(f.key)}
            >
              {f.pivot}
            </button>
          ))}
        </div>
      </nav>

      <div className="zn-body">
        <section className="zn-art" aria-label={feature.title} key={featured}>
          <History feature={feature} />
          <div className="zn-art-value">{valueText}</div>
          <div className="zn-art-unit">{feature.unit}</div>
        </section>

        <section className="zn-meta">
          <div className="zn-eyebrow">now driving</div>
          <div className="zn-title">{feature.title}</div>
          <div className={`zn-sub${active.length ? ' alert' : ''}`}>{status}</div>

          <ol className="zn-list">
            {FEATURES.filter((f) => f.key !== featured).map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  className={`zn-row zn-row-${featureState(f.key, r)}`}
                  onClick={() => choose(f.key)}
                >
                  <span className="zn-row-label">{f.title}</span>
                  <span className="zn-row-value">
                    {f.text(r)}
                    <small>{f.unit}</small>
                  </span>
                </button>
              </li>
            ))}
            {EXTRAS.map((x) => (
              <li key={x.key}>
                <div className="zn-row zn-row-extra">
                  <span className="zn-row-label">{x.label}</span>
                  <span className="zn-row-value">
                    {x.text(r)}
                    {x.unit && <small>{x.unit}</small>}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Progress feature={feature} r={r} />
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return <span className="zn-clock">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}

/** The Zune HD scrubber: thin line, elapsed left, "remaining" right. */
function Progress({ feature, r }: { feature: Feature; r: ZuneReadings }) {
  const v = feature.value(r);
  const pos = fraction(v, feature.min, feature.max);
  return (
    <footer className="zn-progress">
      <span className="zn-end">{feature.ends[0]}</span>
      <div
        className="zn-line"
        role="meter"
        aria-label={`${feature.title} meter`}
        aria-valuemin={feature.min}
        aria-valuemax={feature.max}
        aria-valuenow={v}
      >
        <span className="zn-fill" style={{ width: `${v === undefined ? 0 : pos * 100}%` }} />
        {feature.red !== undefined && (
          <span className="zn-red" style={{ left: `${fraction(feature.red, feature.min, feature.max) * 100}%` }} />
        )}
        {v !== undefined && <span className="zn-thumb" style={{ left: `${pos * 100}%` }} />}
      </div>
      <span className="zn-end">{feature.ends[1]}</span>
    </footer>
  );
}

/** The last ~15 s of the featured reading, drawn faintly across the art. */
function History({ feature }: { feature: Feature }) {
  const name = feature.history.names.find((n) => getChannelHistoryBuffer(n).length > 1);
  const raw = name ? getChannelHistoryBuffer(name).slice(-150) : [];
  if (raw.length < 2) return null;
  const hist = feature.history.map ? raw.map(feature.history.map) : raw;
  const pts = hist.map(
    (v, k) => `${((k / (hist.length - 1)) * 100).toFixed(2)},${(100 - fraction(v, feature.min, feature.max) * 100).toFixed(2)}`,
  );
  return (
    <svg className="zn-history" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,100 ${pts.join(' ')} 100,100`} />
      <polyline points={pts.join(' ')} />
    </svg>
  );
}
