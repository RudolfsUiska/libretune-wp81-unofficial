import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Download, FolderPlus, Globe, Maximize2, Palette, PinOff, Plus, Unplug } from 'lucide-react';
import { useChannels } from '../../stores/realtimeStore';
import { CHANNELS, pick } from '../../components/dashboards/engineReadings';
import { IconFace, ProgressDots, Tile, TileSize } from '../controls';
import { pageTitle, useMetro } from '../context';
import { nav, useBackLayer } from '../nav';
import { useMetroPrefs } from '../theme';
import { useStartWallpaper, useWallpaper } from '../wallpaper';
import { NEXT_SIZE, StartTile, setStartTiles, useStartTiles } from '../startLayout';
import {
  Activity,
  Cable,
  Flame,
  FolderOpen,
  Gauge,
  Glyph,
  HelpCircle,
  Layers,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Terminal,
  Wand2,
  iconForKind,
} from '../icons';

const RED = '#E51400';

/** Tile grid geometry: columns from the width, unit size in px. */
function useGrid(moreTiles: boolean) {
  // A callback ref: the grid element changes when a project opens or closes.
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [geo, setGeo] = useState({ cols: 4, unit: 80 });
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const gap = 8;
      // Four columns (six with "more tiles") per ~400px, so medium tiles
      // always line up in pairs.
      const per = moreTiles ? 6 : 4;
      const cols = Math.max(per, Math.round(w / 400) * per);
      setGeo({ cols, unit: Math.max(40, (w - gap * (cols - 1)) / cols) });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return; // jsdom
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, moreTiles]);
  return { ref: setEl, ...geo };
}

export function StartPage() {
  const m = useMetro();
  const prefs = useMetroPrefs();
  const grid = useGrid(prefs.moreTiles);
  // Start background: the picture shows through the tiles, with parallax.
  const wallpaper = useWallpaper();
  const startRef = useRef<HTMLDivElement>(null);
  useStartWallpaper(startRef, wallpaper);

  // Swipe left, as on the phone, for the list of everything.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (dx < -80 && Math.abs(t.clientY - s.y) < Math.abs(dx) / 2) nav.push({ kind: 'apps' });
  };

  const style = {
    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
    gridAutoRows: `${grid.unit}px`,
    ['--unit' as string]: `${grid.unit}px`,
  } as React.CSSProperties;

  return (
    <div
      ref={startRef}
      className={`wp-page wp-start${wallpaper.css ? ' has-wallpaper' : ''}`}
      style={wallpaper.css ? ({ '--wp-wall': wallpaper.css } as React.CSSProperties) : undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {wallpaper.css && (
        <div className="wp-wall-mask" aria-hidden="true">
          <div className="wp-wall-img" />
        </div>
      )}
      {m.currentProject ? (
        <ProjectTiles gridRef={grid.ref} style={style} />
      ) : (
        <div className="wp-tiles" ref={grid.ref} style={style}>
          <NoProjectTiles />
        </div>
      )}
      <button className="wp-start-all wp-tilt" onClick={() => nav.push({ kind: 'apps' })} aria-label="All commands">
        <span className="wp-round"><ArrowRight size={20} strokeWidth={1.8} /></span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/** A grid cell sized for its tile. */
function Slot({ size, i, children }: { size: TileSize; i: number; children: ReactNode }) {
  return (
    <div className={`wp-tile-slot wp-tile-slot-${size}`} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
      {children}
    </div>
  );
}

function NoProjectTiles() {
  const m = useMetro();
  const recent = m.availableProjects.slice(0, 8);
  const tiles: { key: string; size: TileSize; node: ReactNode }[] = [
    {
      key: 'new',
      size: 'wide',
      node: (
        <Tile
          size="wide"
          label="connect ecu"
          faces={[
            <div className="wp-face-wide">
              <FolderPlus size={44} strokeWidth={1.3} />
              <div>
                <div className="wp-face-big">new project</div>
                <div className="wp-face-sub">detect an ECU or start offline</div>
              </div>
            </div>,
          ]}
          onClick={m.actions.newProject}
        />
      ),
    },
    { key: 'import', size: 'medium', node: <Tile size="medium" label="import" faces={[<IconFace icon={<Download size={48} strokeWidth={1.3} />} />]} onClick={m.actions.importProject} /> },
    { key: 'ini', size: 'medium', node: <Tile size="medium" label="ini online" faces={[<IconFace icon={<Globe size={48} strokeWidth={1.3} />} />]} onClick={m.actions.searchIniOnline} /> },
    ...recent.map((p) => ({
      key: p.path,
      size: 'medium' as TileSize,
      node: (
        <Tile
          size="medium"
          label={p.name.toLowerCase()}
          animation="peek"
          faces={[
            <IconFace icon={<FolderOpen size={48} strokeWidth={1.3} />} />,
            <div className="wp-face-text">
              <div className="wp-face-mid">{p.name}</div>
              <div className="wp-face-sub">{p.signature}</div>
            </div>,
          ]}
          onClick={() => m.actions.openProject(p.path)}
        />
      ),
    })),
    { key: 'settings', size: 'small', node: <Tile size="small" faces={[<IconFace icon={<Glyph icon={Settings} size={30} />} />]} label="settings" onClick={() => nav.push({ kind: 'settings' })} /> },
    { key: 'theme', size: 'small', node: <Tile size="small" faces={[<IconFace icon={<Palette size={30} strokeWidth={1.5} />} />]} label="theme" onClick={() => nav.push({ kind: 'theme' })} /> },
    { key: 'help', size: 'small', node: <Tile size="small" faces={[<IconFace icon={<Glyph icon={HelpCircle} size={30} />} />]} label="help" onClick={m.actions.manual} /> },
    { key: 'projects', size: 'small', node: <Tile size="small" faces={[<IconFace icon={<Plus size={30} strokeWidth={1.5} />} />]} label="projects" onClick={() => nav.push({ kind: 'projects' })} /> },
  ];
  return (
    <>
      {tiles.map((t, i) => (
        <Slot key={t.key} size={t.size} i={i}>
          {t.node}
        </Slot>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */

function ProjectTiles({ gridRef, style }: { gridRef: (el: HTMLDivElement | null) => void; style: React.CSSProperties }) {
  const m = useMetro();
  const stored = useStartTiles();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<StartTile[]>(stored);
  useEffect(() => setOrder(stored), [stored]);

  const exitEdit = () => {
    setEditing(false);
    setSelected(null);
  };
  useBackLayer(editing, exitEdit);

  const visible = order.filter((t) => tileAvailable(t, m));

  const save = (next: StartTile[]) => {
    setOrder(next);
    setStartTiles(next);
  };
  const unpin = (id: string) => {
    save(order.filter((t) => t.id !== id));
    setSelected(null);
  };
  const resize = (id: string) => save(order.map((t) => (t.id === id ? { ...t, size: NEXT_SIZE[t.size] } : t)));

  // Drag the selected tile over another to move it there.
  const dragging = useRef(false);
  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (!editing || selected !== id) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (id: string) => (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const under = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => (el as HTMLElement).closest?.('[data-tile]') as HTMLElement | null)
      .find((el) => el && el.dataset.tile !== id);
    const overId = under?.dataset.tile;
    if (!overId) return;
    const from = order.findIndex((t) => t.id === id);
    const to = order.findIndex((t) => t.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const next = order.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  };
  const onPointerUp = () => {
    if (dragging.current) {
      dragging.current = false;
      setStartTiles(order);
    }
  };

  return (
    <div
      className={`wp-tiles${editing ? ' editing' : ''}`}
      ref={gridRef}
      style={style}
      onClick={(e) => {
        if (editing && e.target === e.currentTarget) exitEdit();
      }}
    >
      {visible.map((t, i) => (
        <div
          key={t.id}
          data-tile={t.id}
          className={`wp-tile-slot wp-tile-slot-${t.size}`}
          style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          onPointerDown={onPointerDown(t.id)}
          onPointerMove={onPointerMove(t.id)}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <LiveTile
            tile={t}
            editing={editing}
            selected={selected === t.id}
            onTap={() => {
              if (editing) setSelected(t.id);
              else activateTile(t, m);
            }}
            onLongPress={() => {
              setEditing(true);
              setSelected(t.id);
            }}
          >
            {editing && selected === t.id && (
              <>
                <button className="wp-tile-action unpin" onClick={() => unpin(t.id)} aria-label="Unpin">
                  <PinOff size={14} strokeWidth={2} />
                </button>
                <button className="wp-tile-action resize" onClick={() => resize(t.id)} aria-label="Resize">
                  <Maximize2 size={13} strokeWidth={2} />
                </button>
              </>
            )}
          </LiveTile>
        </div>
      ))}
    </div>
  );
}

type Ctx = ReturnType<typeof useMetro>;

function tileAvailable(t: StartTile, m: Ctx): boolean {
  const caps = m.iniCapabilities;
  switch (t.id) {
    case 'dashboard':
      return m.hasDashboard;
    case 'log':
      return m.canLog;
    case 'console':
      return !!caps?.supports_console;
    default:
      return true;
  }
}

function activateTile(t: StartTile, m: Ctx) {
  if (t.target) {
    if (t.target === 'dashboard') m.openDashboard();
    else m.open(t.target, t.label);
    return;
  }
  switch (t.id) {
    case 'connect':
      return nav.push({ kind: 'connect' });
    case 'dashboard':
      return m.openDashboard();
    case 'tune':
      return nav.push({ kind: 'tune' });
    case 'log':
      return m.toggleLogging();
    case 'burn':
      return m.actions.burn();
    case 'save':
      return m.actions.saveTune();
    case 'open':
      return m.actions.loadTune();
    case 'pages':
      return nav.push({ kind: 'tasks' });
    case 'autotune':
      return m.open('autotune', 'AutoTune');
    case 'project':
      return nav.push({ kind: 'projects' });
    case 'settings':
      return nav.push({ kind: 'settings' });
    case 'search':
      return nav.push({ kind: 'apps' });
    case 'console':
      return m.open('console', `Console - ${m.ecuType}`);
    case 'help':
      return m.actions.manual();
  }
}

/* ------------------------------------------------------------------------ */

function LiveTile({
  tile,
  editing,
  selected,
  onTap,
  onLongPress,
  children,
}: {
  tile: StartTile;
  editing: boolean;
  selected: boolean;
  onTap: () => void;
  onLongPress: () => void;
  children?: ReactNode;
}) {
  const m = useMetro();
  const common = { size: tile.size, editing, selected, onClick: onTap, onLongPress, children };
  const icon = (node: ReactNode) => <IconFace icon={node} />;
  const big = tile.size === 'small' ? 30 : 48;

  if (tile.target) {
    const Icon = iconForKind(tile.kind);
    return <Tile {...common} label={pageTitle(tile.label || tile.target, tile.target).toLowerCase()} faces={[icon(<Icon size={big} strokeWidth={1.3} />)]} />;
  }

  switch (tile.id) {
    case 'connect':
      return <ConnectTile {...common} />;
    case 'dashboard':
      return (
        <Tile
          {...common}
          label="dashboard"
          animation="peek"
          faces={m.connected && tile.size !== 'small' ? [icon(<Gauge size={big} strokeWidth={1.3} />), <RpmFace />] : [icon(<Gauge size={big} strokeWidth={1.3} />)]}
        />
      );
    case 'tune':
      return (
        <Tile
          {...common}
          label="tune"
          faces={[icon(<SlidersHorizontal size={big} strokeWidth={1.3} />)]}
          badge={tile.size !== 'small' && m.backendMenus.length > 0 ? m.backendMenus.length : undefined}
        />
      );
    case 'log':
      return (
        <Tile
          {...common}
          label={m.isLogging ? 'recording' : 'log'}
          color={m.isLogging ? RED : undefined}
          faces={[
            m.isLogging ? (
              <div className="wp-face-text center">
                <div className="wp-face-rec" />
                {tile.size !== 'small' && <div className="wp-face-mid">{m.logDuration || '0:00'}</div>}
              </div>
            ) : (
              icon(<Activity size={big} strokeWidth={1.3} />)
            ),
          ]}
        />
      );
    case 'burn': {
      const pending = m.connected && m.tuneModified;
      return (
        <Tile
          {...common}
          label="burn"
          color={pending ? RED : undefined}
          className={pending ? '' : 'wp-tile-idle'}
          faces={[icon(<Flame size={big} strokeWidth={1.3} />)]}
        />
      );
    }
    case 'save':
      return <Tile {...common} label="save" faces={[icon(<Save size={big} strokeWidth={1.3} />)]} />;
    case 'open':
      return <Tile {...common} label="open tune" faces={[icon(<FolderOpen size={big} strokeWidth={1.3} />)]} />;
    case 'pages':
      return (
        <Tile
          {...common}
          label="pages"
          faces={[icon(<Layers size={big} strokeWidth={1.3} />)]}
          badge={m.tabs.length > 0 ? m.tabs.length : undefined}
        />
      );
    case 'autotune':
      return <Tile {...common} label="autotune" faces={[icon(<Wand2 size={big} strokeWidth={1.3} />)]} />;
    case 'project': {
      const p = m.currentProject;
      return (
        <Tile
          {...common}
          label="project"
          animation="peek"
          faces={[
            icon(<FolderOpen size={big} strokeWidth={1.3} />),
            ...(p && tile.size !== 'small'
              ? [
                  <div className="wp-face-text">
                    <div className="wp-face-mid">{p.name}</div>
                    <div className="wp-face-sub">{p.signature}</div>
                  </div>,
                ]
              : []),
          ]}
        />
      );
    }
    case 'settings':
      return <Tile {...common} label="settings" faces={[icon(<Settings size={big} strokeWidth={1.3} />)]} />;
    case 'search':
      return <Tile {...common} label="search" faces={[icon(<Search size={big} strokeWidth={1.3} />)]} />;
    case 'console':
      return <Tile {...common} label="console" faces={[icon(<Terminal size={big} strokeWidth={1.3} />)]} />;
    case 'help':
      return <Tile {...common} label="help" faces={[icon(<HelpCircle size={big} strokeWidth={1.3} />)]} />;
    default:
      return <Tile {...common} label={tile.id} faces={[icon(null)]} />;
  }
}

type CommonTileProps = {
  size: TileSize;
  editing: boolean;
  selected: boolean;
  onClick: () => void;
  onLongPress: () => void;
  children?: ReactNode;
};

function ConnectTile(props: CommonTileProps) {
  const m = useMetro();
  const phase = m.connectionPhase;
  const small = props.size === 'small';
  const busy = phase === 'connecting' || phase === 'syncing' || phase === 'auto-connect';

  let headline = 'not connected';
  if (phase === 'connected') headline = 'connected';
  else if (phase === 'syncing') headline = `syncing ${m.syncProgress?.percent ?? 0}%`;
  else if (busy) headline = 'connecting';
  else if (phase === 'signature-mismatch') headline = 'signature mismatch';
  else if (phase === 'auto-connect-waiting') headline = 'waiting for ecu';

  const sub = m.connected ? m.status.signature || m.ecuType : m.selectedPort ? portLabel(m.selectedPort) : 'tap to choose a port';

  const front = small ? (
    <IconFace icon={m.connected ? <Cable size={30} strokeWidth={1.4} /> : <Unplug size={30} strokeWidth={1.4} />} />
  ) : (
    <div className="wp-face-wide">
      {m.connected ? <Cable size={40} strokeWidth={1.3} /> : <Unplug size={40} strokeWidth={1.3} />}
      <div className="wp-face-grow">
        <div className="wp-face-big">{headline}</div>
        <div className="wp-face-sub">{sub}</div>
        {busy && <ProgressDots className="wp-dots-tile" />}
      </div>
    </div>
  );

  const faces = m.connected && !small ? [front, <ReadingsFace wide={props.size === 'wide'} />] : [front];
  return <Tile {...props} label="ecu" faces={faces} />;
}

function portLabel(p: string): string {
  // Android USB ports look like "usb:0483:5740 STM32 Virtual ComPort".
  return p.startsWith('usb:') ? p.replace(/^usb:\S+\s*/, '') || p : p;
}

const LIVE = [...CHANNELS.rpm, ...CHANNELS.coolant, ...CHANNELS.afr];

function ReadingsFace({ wide }: { wide: boolean }) {
  const v = useChannels(LIVE);
  const rpm = pick(v, CHANNELS.rpm);
  const clt = pick(v, CHANNELS.coolant);
  const afr = pick(v, CHANNELS.afr);
  const cells = [
    { label: 'rpm', value: rpm !== undefined ? Math.round(rpm).toString() : '—' },
    { label: 'clt', value: clt !== undefined ? `${Math.round(clt)}°` : '—' },
    ...(wide ? [{ label: 'afr', value: afr !== undefined ? afr.toFixed(1) : '—' }] : []),
  ];
  return (
    <div className="wp-face-readings">
      {cells.map((c) => (
        <div key={c.label}>
          <div className="wp-face-big">{c.value}</div>
          <div className="wp-face-sub">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function RpmFace() {
  const v = useChannels(CHANNELS.rpm as unknown as string[]);
  const rpm = pick(v, CHANNELS.rpm);
  return (
    <div className="wp-face-text">
      <div className="wp-face-huge">{rpm !== undefined ? Math.round(rpm) : '—'}</div>
      <div className="wp-face-sub">rpm</div>
    </div>
  );
}
