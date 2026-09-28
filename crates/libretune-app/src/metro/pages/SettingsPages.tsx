import { useRef, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { openDashboardsFullscreen, openTabsFullscreen } from '../../utils/viewFullscreen';
import { ListItem, ListPicker, MessageBox, PageHeader, ToggleSwitch } from '../controls';
import { useMetro } from '../context';
import { nav, useBackLayer } from '../nav';
import {
  ACCENTS,
  DENSITIES,
  THEMES,
  THEME_LOOK,
  accentHex,
  onAccent,
  setMetroPrefs,
  setMetroTheme,
  useMetroPrefs,
  type AccentName,
} from '../theme';
import { resetStartTiles } from '../startLayout';
import {
  BUILTIN_WALLPAPERS,
  setWallpaper,
  setWallpaperPhoto,
  useWallpaper,
  useWallpaperGeometry,
  type WallpaperChoice,
} from '../wallpaper';

export function SettingsPage() {
  const m = useMetro();
  const prefs = useMetroPrefs();
  const dashFs = openDashboardsFullscreen.use();
  const tabsFs = openTabsFullscreen.use();
  const [confirmReset, setConfirmReset] = useState(false);
  const density = DENSITIES.find((d) => d.value === prefs.density) ?? DENSITIES[1];

  return (
    <div className="wp-page">
      <PageHeader title="settings" />
      <div className="wp-scroll">
        <div className="wp-group-header">system</div>
        <ListItem title="start+theme" subtitle={`${THEME_LOOK[prefs.background].label} · ${prefs.accent === 'theme' ? 'theme accent' : prefs.accent}`} onClick={() => nav.push({ kind: 'theme' })} />
        <ListItem
          title="connection"
          subtitle={m.connected ? `connected · ${m.status.signature ?? ''}` : 'disconnected'}
          onClick={() => nav.push({ kind: 'connect' })}
        />
        <ListItem title="projects" subtitle={m.currentProject?.name ?? 'no project open'} onClick={() => nav.push({ kind: 'projects' })} />

        <div className="wp-group-header">display</div>
        <div className="wp-form">
          <ListPicker
            header="display density"
            value={density.value as number}
            options={DENSITIES.map((d) => d.value as number)}
            render={(v) => DENSITIES.find((d) => d.value === v)?.label ?? String(v)}
            onChange={(v) => setMetroPrefs({ density: v })}
          />
          <ToggleSwitch
            header="Open dashboards full screen"
            checked={dashFs}
            onChange={(on) => openDashboardsFullscreen.set(on)}
            description="For the phone on a dash mount: the gauges take the whole screen. Back leaves."
          />
          <ToggleSwitch header="Open pages full screen" checked={tabsFs} onChange={(on) => openTabsFullscreen.set(on)} />
        </div>

        <div className="wp-group-header">tuning software</div>
        <ListItem title="all settings" subtitle="units, logging, gauges, language, hotkeys" onClick={m.actions.advancedSettings} />
        <ListItem title="user manual" onClick={m.actions.manual} />
        <ListItem title="about" subtitle="LibreTune, GPL-2.0" onClick={m.actions.about} />
        <ListItem title="reset start screen" subtitle="default tiles; removes pinned pages" onClick={() => setConfirmReset(true)} />
      </div>
      <MessageBox
        open={confirmReset}
        title="reset start?"
        message="Tiles go back to the default layout and pinned pages are removed."
        onClose={() => setConfirmReset(false)}
        buttons={[
          { label: 'reset', onClick: resetStartTiles },
          { label: 'cancel', onClick: () => {} },
        ]}
      />
    </div>
  );
}

export function ThemePage() {
  const prefs = useMetroPrefs();
  const [picking, setPicking] = useState<null | 'theme' | 'accent' | 'wallpaper'>(null);
  useBackLayer(!!picking, () => setPicking(null));
  const look = THEME_LOOK[prefs.background];
  const accent = accentHex(prefs.accent, prefs.background);
  const wallpaper = useWallpaper();
  const previewRef = useRef<HTMLDivElement>(null);
  useWallpaperGeometry(previewRef, wallpaper, '.wp-theme-tile');
  const { showToast } = useToast();
  const wallLabel =
    wallpaper.choice.kind === 'photo'
      ? 'my photo'
      : wallpaper.choice.kind === 'builtin'
        ? BUILTIN_WALLPAPERS.find((w) => w.id === (wallpaper.choice as { id: string }).id)?.label ?? ''
        : 'none';
  const isChoice = (c: WallpaperChoice) => JSON.stringify(c) === JSON.stringify(wallpaper.choice);
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPicking(null);
    try {
      await setWallpaperPhoto(file);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <div className="wp-page">
      <PageHeader title="start+theme" />
      <div className="wp-scroll wp-form">
        <div
          ref={previewRef}
          className={`wp-theme-preview${wallpaper.css ? ' has-wallpaper' : ''}`}
          style={wallpaper.css ? ({ '--wp-wall': wallpaper.css } as React.CSSProperties) : undefined}
        >
          <span className="wp-theme-tile wide" />
          <span className="wp-theme-tile" />
          <span className="wp-theme-tile" />
          <span className="wp-theme-tile small" />
          <span className="wp-theme-tile small" />
          <span className="wp-theme-tile small" />
          <span className="wp-theme-tile small" />
        </div>
        <div className="wp-picker">
          <div className="wp-field-header">background</div>
          <button className="wp-picker-box wp-tilt wp-accent-box" onClick={() => setPicking('theme')}>
            <span className="wp-swatch" style={{ background: look.bg, outline: '1px solid rgba(128,128,128,0.6)' }} />
            {look.label}
          </button>
        </div>
        <div className="wp-picker">
          <div className="wp-field-header">accent color</div>
          <button className="wp-picker-box wp-tilt wp-accent-box" onClick={() => setPicking('accent')}>
            <span className="wp-swatch" style={{ background: accent }} />
            {prefs.accent === 'theme' ? `${look.label}'s own` : prefs.accent}
          </button>
        </div>
        <div className="wp-picker">
          <div className="wp-field-header">start background</div>
          <button className="wp-picker-box wp-tilt wp-accent-box" onClick={() => setPicking('wallpaper')}>
            <span
              className="wp-swatch"
              style={{ backgroundImage: wallpaper.css ?? 'none', backgroundSize: 'cover', backgroundColor: accent }}
            />
            {wallLabel}
          </button>
          <div className="wp-field-desc">Shows through the tiles and drifts as Start scrolls, as on Windows Phone 8.1.</div>
        </div>
        <ToggleSwitch
          header="Show more tiles"
          checked={prefs.moreTiles}
          onChange={(on) => setMetroPrefs({ moreTiles: on })}
          description="Six columns of small tiles instead of four."
        />
        <p className="wp-field-desc">
          The background is also LibreTune's theme: tables, gauges and dialogs follow it. Settings &gt; all settings &gt;
          appearance changes the same thing.
        </p>
      </div>

      {picking === 'theme' && (
        <div className="wp-picker-full wp-turnstile-in">
          <div className="wp-picker-full-title">BACKGROUND</div>
          <div className="wp-picker-full-list">
            {THEMES.map((t) => {
              const l = THEME_LOOK[t];
              return (
                <button
                  key={t}
                  className={`wp-theme-option${t === prefs.background ? ' selected' : ''}`}
                  onClick={() => {
                    setMetroTheme(t);
                    setPicking(null);
                  }}
                >
                  <span className="wp-theme-chip" style={{ background: l.bg, color: l.fg }}>
                    <span style={{ background: l.accent }} />
                    <span style={{ background: l.accent }} />
                    <span style={{ background: l.accent }} />
                    Aa
                  </span>
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {picking === 'wallpaper' && (
        <div className="wp-picker-full wp-turnstile-in">
          <div className="wp-picker-full-title">START BACKGROUND</div>
          <div className="wp-wall-grid">
            <button
              className={`wp-wall-cell none${isChoice({ kind: 'none' }) ? ' selected' : ''}`}
              style={{ backgroundColor: look.bg }}
              onClick={() => {
                setWallpaper({ kind: 'none' });
                setPicking(null);
              }}
            >
              <i />
              <span>none</span>
            </button>
            {BUILTIN_WALLPAPERS.map((w) => (
              <button
                key={w.id}
                className={`wp-wall-cell${isChoice({ kind: 'builtin', id: w.id }) ? ' selected' : ''}`}
                style={{ backgroundImage: w.css }}
                onClick={() => {
                  setWallpaper({ kind: 'builtin', id: w.id });
                  setPicking(null);
                }}
              >
                <i />
                <span>{w.label}</span>
              </button>
            ))}
            <label
              className={`wp-wall-cell photo${wallpaper.choice.kind === 'photo' ? ' selected' : ''}`}
              style={wallpaper.choice.kind === 'photo' ? { backgroundImage: wallpaper.css ?? undefined } : undefined}
            >
              {wallpaper.choice.kind === 'photo' ? <span>my photo · change</span> : 'choose photo…'}
              <input type="file" accept="image/*" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      )}

      {picking === 'accent' && (
        <div className="wp-picker-full wp-turnstile-in">
          <div className="wp-picker-full-title">ACCENTS</div>
          <div className="wp-accent-grid">
            <button
              className={`wp-accent-cell wp-accent-theme${prefs.accent === 'theme' ? ' selected' : ''}`}
              style={{ background: look.accent, color: onAccent(look.accent) }}
              aria-label={`${look.label}'s own accent`}
              onClick={() => {
                setMetroPrefs({ accent: 'theme' });
                setPicking(null);
              }}
            >
              theme
            </button>
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                className={`wp-accent-cell${a.name === prefs.accent ? ' selected' : ''}`}
                style={{ background: a.hex }}
                aria-label={a.name}
                onClick={() => {
                  setMetroPrefs({ accent: a.name as AccentName });
                  setPicking(null);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
