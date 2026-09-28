import { useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { MenuItem } from '../../components/tuner-ui';
import { AppBar, ContextMenu } from '../controls';
import { cleanLabel, useMetro } from '../context';
import { nav, useBackLayer, type Route } from '../nav';
import { pinToStart } from '../startLayout';
import { Glyph, Layers, Settings } from '../icons';

interface Command {
  key: string;
  label: string;
  path: string;
  disabled?: boolean;
  checked?: boolean;
  run: () => void;
  /** Tab target, when the command opens a page (pinnable). */
  target?: string;
}

const LETTERS = '#abcdefghijklmnopqrstuvwxyz'.split('');

function letterOf(label: string): string {
  const c = label.charAt(0).toLowerCase();
  return c >= 'a' && c <= 'z' ? c : '#';
}

/**
 * The app list: every command the desktop menus offered, flattened and sorted
 * alphabetically under letter headers. Tapping a letter opens the jump grid.
 */
export function AppsPage() {
  const m = useMetro();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [jump, setJump] = useState(false);
  const [menu, setMenu] = useState<{ rect: DOMRect; cmd: Command } | null>(null);
  useBackLayer(jump, () => setJump(false));
  useBackLayer(searching, () => {
    setSearching(false);
    setQuery('');
  });
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    const out: Command[] = [];
    const ini = new Set(m.backendMenus.map((b) => b.name));
    const walk = (items: MenuItem[] | undefined, path: string[], fromIni: boolean) => {
      for (const it of items ?? []) {
        if (it.separator || !it.label) continue;
        const label = cleanLabel(it.label);
        if (it.items && it.items.length) {
          walk(it.items, [...path, label], fromIni);
        } else if (it.onClick) {
          out.push({
            key: `${path.join('/')}/${it.id}/${label}`,
            label,
            path: path.join(' › ').toLowerCase(),
            disabled: it.disabled,
            checked: it.checked,
            run: it.onClick,
            target: fromIni && !it.id.startsWith('std_') ? it.id : undefined,
          });
        }
      }
    };
    for (const top of m.menuItems) {
      if (top.separator) continue;
      walk(top.items, [cleanLabel(top.label)], ini.has(top.id));
    }
    const shell: [string, Route][] = [
      ['Theme and accent colour', { kind: 'theme' }],
      ['Open pages', { kind: 'tasks' }],
      ['ECU connection', { kind: 'connect' }],
      ['Projects', { kind: 'projects' }],
      ['Settings', { kind: 'settings' }],
    ];
    for (const [label, route] of shell) {
      out.push({ key: `shell/${label}`, label, path: 'libretune', run: () => nav.push(route) });
    }
    // Menus often repeat a command (Settings in File and Tools); keep one.
    const seen = new Set<string>();
    const unique = out.filter((c) => {
      const k = `${c.label.toLowerCase()}|${c.target ?? c.path}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return unique.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [m.menuItems, m.backendMenus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      if (c.label.toLowerCase().includes(q) || c.path.includes(q)) return true;
      // Deep search: a dialog matches when one of its fields does.
      const terms = c.target ? m.searchIndex[c.target] : undefined;
      return !!terms?.some((t) => t.toLowerCase().includes(q));
    });
  }, [commands, query, m.searchIndex]);

  const groups = useMemo(() => {
    const g = new Map<string, Command[]>();
    for (const c of filtered) {
      const l = letterOf(c.label);
      if (!g.has(l)) g.set(l, []);
      g.get(l)!.push(c);
    }
    return LETTERS.filter((l) => g.has(l)).map((l) => ({ letter: l, items: g.get(l)! }));
  }, [filtered]);

  const present = new Set(groups.map((g) => g.letter));

  const run = (c: Command) => {
    if (c.disabled) return;
    if (c.target) m.open(c.target, c.label, query.trim() || undefined);
    else c.run();
  };

  return (
    <div className="wp-page wp-apps">
      {searching ? (
        <div className="wp-apps-search">
          <input
            autoFocus
            className="wp-textbox"
            placeholder="search commands and settings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="wp-round small" onClick={() => { setSearching(false); setQuery(''); }} aria-label="Close search">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="wp-apps-top" />
      )}
      <div className="wp-apps-list" ref={listRef}>
        {groups.map((g) => (
          <section key={g.letter} id={`wp-letter-${g.letter}`}>
            {!query && (
              <button className="wp-letter wp-tilt" onClick={() => setJump(true)}>
                {g.letter}
              </button>
            )}
            {g.items.map((c) => (
              <CommandRow
                key={c.key}
                cmd={c}
                onRun={() => run(c)}
                onMenu={c.target ? (rect) => setMenu({ rect, cmd: c }) : undefined}
              />
            ))}
          </section>
        ))}
        {groups.length === 0 && <p className="wp-empty">no results</p>}
      </div>

      {jump && (
        <div className="wp-jump" onClick={() => setJump(false)}>
          <div className="wp-jump-grid">
            {LETTERS.map((l) => (
              <button
                key={l}
                className={`wp-jump-cell${present.has(l) ? '' : ' empty'}`}
                disabled={!present.has(l)}
                onClick={(e) => {
                  e.stopPropagation();
                  setJump(false);
                  requestAnimationFrame(() =>
                    document.getElementById(`wp-letter-${l}`)?.scrollIntoView({ block: 'start' }),
                  );
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <ContextMenu
        anchor={menu?.rect ?? null}
        onClose={() => setMenu(null)}
        items={
          menu
            ? [
                { id: 'open', label: 'open', onClick: () => run(menu.cmd) },
                {
                  id: 'pin',
                  label: 'pin to start',
                  onClick: () => pinToStart(menu.cmd.target!, menu.cmd.label),
                },
              ]
            : []
        }
      />

      <AppBar
        buttons={[
          { id: 'search', icon: <Search size={20} strokeWidth={1.6} />, label: 'search', onClick: () => setSearching(true) },
          { id: 'pages', icon: <Glyph icon={Layers} size={20} />, label: 'pages', onClick: () => nav.push({ kind: 'tasks' }) },
          { id: 'settings', icon: <Glyph icon={Settings} size={20} />, label: 'settings', onClick: () => nav.push({ kind: 'settings' }) },
        ]}
      />
    </div>
  );
}

function CommandRow({ cmd, onRun, onMenu }: { cmd: Command; onRun: () => void; onMenu?: (r: DOMRect) => void }) {
  const initial = cmd.label.charAt(0).toUpperCase();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  return (
    <button
      className="wp-cmd wp-tilt"
      disabled={cmd.disabled}
      onClick={() => {
        if (long.current) {
          long.current = false;
          return;
        }
        onRun();
      }}
      onPointerDown={(e) => {
        if (!onMenu) return;
        long.current = false;
        const el = e.currentTarget;
        timer.current = setTimeout(() => {
          long.current = true;
          navigator.vibrate?.(15);
          onMenu(el.getBoundingClientRect());
        }, 550);
      }}
      onPointerUp={() => timer.current && clearTimeout(timer.current)}
      onPointerLeave={() => timer.current && clearTimeout(timer.current)}
      onPointerCancel={() => timer.current && clearTimeout(timer.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="wp-cmd-icon">{cmd.checked ? <Check size={18} strokeWidth={2} /> : initial}</span>
      <span className="wp-cmd-text">
        <span className="wp-cmd-label">{cmd.label.toLowerCase()}</span>
        <span className="wp-cmd-path">{cmd.path}</span>
      </span>
    </button>
  );
}
