import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useBackLayer } from './nav';

/* ------------------------------------------------------------------------
 * Page header: small-caps app title over a big lowercase page title.
 * ---------------------------------------------------------------------- */

export function PageHeader({ app = 'LIBRETUNE', title, compact }: { app?: string; title?: string; compact?: boolean }) {
  return (
    <header className={`wp-header${compact ? ' wp-header-compact' : ''}`}>
      <div className="wp-header-app">{app}</div>
      {title && <h1 className="wp-header-title">{title.toLowerCase()}</h1>}
    </header>
  );
}

/* ------------------------------------------------------------------------
 * App bar: round icon buttons along the bottom, "..." expands it to show
 * labels and the lowercase menu items. "minimal" shows only the ellipsis.
 * ---------------------------------------------------------------------- */

export interface AppBarButton {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Filled circle, e.g. logging in progress. */
  active?: boolean;
  /** Red circle, e.g. unburned changes. */
  alert?: boolean;
}

export interface AppBarMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function AppBar({
  buttons,
  menu = [],
  mode = 'compact',
}: {
  buttons: AppBarButton[];
  menu?: AppBarMenuItem[];
  mode?: 'compact' | 'minimal';
}) {
  const [open, setOpen] = useState(false);
  useBackLayer(open, () => setOpen(false));
  const close = useCallback(() => setOpen(false), []);
  const run = (fn: () => void) => () => {
    setOpen(false);
    // Let the bar close before a dialog opens over it.
    setTimeout(fn, 60);
  };
  const minimal = mode === 'minimal' && !open;

  return (
    <>
      {open && <div className="wp-appbar-scrim" onClick={close} />}
      <nav className={`wp-appbar${open ? ' open' : ''}${minimal ? ' minimal' : ''}`}>
        {!minimal && (
          <div className="wp-appbar-buttons">
            {buttons.slice(0, 4).map((b) => (
              <button
                key={b.id}
                className={`wp-appbar-btn wp-tilt${b.active ? ' active' : ''}${b.alert ? ' alert' : ''}`}
                disabled={b.disabled}
                onClick={run(b.onClick)}
                aria-label={b.label}
              >
                <span className="wp-appbar-circle">{b.icon}</span>
                <span className="wp-appbar-label">{b.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        )}
        <button
          className="wp-appbar-more"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse app bar' : 'More'}
        >
          <MoreHorizontal size={22} strokeWidth={2.4} />
        </button>
        {open && menu.length > 0 && (
          <ul className="wp-appbar-menu">
            {menu.map((m) => (
              <li key={m.id}>
                <button disabled={m.disabled} onClick={run(m.onClick)}>
                  {m.label.toLowerCase()}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  );
}

/* ------------------------------------------------------------------------
 * Pivot: big lowercase headers that rotate so the current one leads, and
 * swipeable content underneath.
 * ---------------------------------------------------------------------- */

export interface PivotItem {
  key: string;
  header: string;
  content: ReactNode;
}

export function Pivot({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: PivotItem[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const n = items.length;
  const idx = n === 0 ? 0 : ((selected % n) + n) % n;
  const [dir, setDir] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number; dx: number; locked: boolean | null } | null>(null);
  const [drag, setDrag] = useState(0);

  const go = (next: number, d: 1 | -1) => {
    setDir(d);
    onSelect(((next % n) + n) % n);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, dx: 0, locked: null };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = touch.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.locked === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      // Horizontal intent swipes the pivot; vertical leaves the list scrolling.
      s.locked = Math.abs(dx) > Math.abs(dy) * 1.2;
    }
    if (s.locked) {
      s.dx = dx;
      setDrag(dx);
    }
  };
  const onTouchEnd = () => {
    const s = touch.current;
    touch.current = null;
    setDrag(0);
    if (!s || !s.locked || n < 2) return;
    if (s.dx < -50) go(idx + 1, 1);
    else if (s.dx > 50) go(idx - 1, -1);
  };

  const ordered = n === 0 ? [] : Array.from({ length: n }, (_, i) => ({ item: items[(idx + i) % n], i: (idx + i) % n }));

  return (
    <div className="wp-pivot">
      <div className="wp-header-app wp-pivot-app">{title}</div>
      <div className="wp-pivot-headers" key={`h${idx}`} data-dir={dir}>
        {ordered.map(({ item, i }, pos) => (
          <button
            key={item.key}
            className={`wp-pivot-header${pos === 0 ? ' current' : ''}`}
            onClick={() => pos !== 0 && go(i, 1)}
          >
            {item.header.toLowerCase()}
          </button>
        ))}
      </div>
      <div
        className="wp-pivot-body"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {n > 0 && (
          <div
            key={items[idx].key}
            className="wp-pivot-item"
            data-dir={dir}
            style={drag ? { transform: `translateX(${drag * 0.6}px)`, animation: 'none' } : undefined}
          >
            {items[idx].content}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------
 * List items.
 * ---------------------------------------------------------------------- */

export function ListItem({
  title,
  subtitle,
  icon,
  onClick,
  onLongPress,
  disabled,
  accentSubtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClick?: () => void;
  onLongPress?: (rect: DOMRect) => void;
  disabled?: boolean;
  accentSubtitle?: boolean;
  trailing?: ReactNode;
}) {
  const press = useLongPress(onLongPress);
  return (
    <button className="wp-listitem wp-tilt" disabled={disabled} onClick={press.wrapClick(onClick)} {...press.handlers}>
      {icon && <span className="wp-listitem-icon">{icon}</span>}
      <span className="wp-listitem-text">
        <span className="wp-listitem-title">{title}</span>
        {subtitle && <span className={`wp-listitem-sub${accentSubtitle ? ' accent' : ''}`}>{subtitle}</span>}
      </span>
      {trailing}
    </button>
  );
}

/** Long press (touch or mouse), suppressing the click that follows it. */
export function useLongPress(onLongPress?: (rect: DOMRect) => void, ms = 550) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const handlers = onLongPress
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          fired.current = false;
          start.current = { x: e.clientX, y: e.clientY };
          const el = e.currentTarget;
          clear();
          timer.current = setTimeout(() => {
            fired.current = true;
            navigator.vibrate?.(15);
            onLongPress(el.getBoundingClientRect());
          }, ms);
        },
        onPointerMove: (e: React.PointerEvent) => {
          const s = start.current;
          if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) clear();
        },
        onPointerUp: clear,
        onPointerCancel: clear,
        onPointerLeave: clear,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};
  const wrapClick = (fn?: () => void) => () => {
    if (fired.current) {
      fired.current = false;
      return;
    }
    fn?.();
  };
  return { handlers, wrapClick };
}

/* ------------------------------------------------------------------------
 * Context menu: the long-pressed item stays put, the page dims behind it and
 * a panel of lowercase commands appears beside it.
 * ---------------------------------------------------------------------- */

export function ContextMenu({
  anchor,
  items,
  onClose,
}: {
  anchor: DOMRect | null;
  items: AppBarMenuItem[];
  onClose: () => void;
}) {
  useBackLayer(!!anchor, onClose);
  if (!anchor) return null;
  const below = anchor.bottom + items.length * 52 < window.innerHeight - 20;
  const style = below ? { top: anchor.bottom } : { bottom: window.innerHeight - anchor.top };
  return (
    <div className="wp-context-scrim" onClick={onClose}>
      <ul className="wp-context" style={style} onClick={(e) => e.stopPropagation()}>
        {items.map((m) => (
          <li key={m.id}>
            <button
              disabled={m.disabled}
              onClick={() => {
                onClose();
                setTimeout(m.onClick, 60);
              }}
            >
              {m.label.toLowerCase()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------
 * Toggle switch (8.1 style): header, On/Off text, square track and thumb.
 * ---------------------------------------------------------------------- */

export function ToggleSwitch({
  header,
  checked,
  onChange,
  description,
}: {
  header: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  description?: string;
}) {
  return (
    <div className="wp-toggle">
      <div className="wp-field-header">{header}</div>
      <button
        className={`wp-toggle-row${checked ? ' on' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="wp-toggle-state">{checked ? 'On' : 'Off'}</span>
        <span className="wp-toggle-track">
          <span className="wp-toggle-fill" />
          <span className="wp-toggle-thumb" />
        </span>
      </button>
      {description && <div className="wp-field-desc">{description}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------------
 * List picker: a box showing the value; tapping opens a full-screen list.
 * ---------------------------------------------------------------------- */

export function ListPicker<T extends string | number>({
  header,
  value,
  options,
  onChange,
  render = (v) => String(v),
}: {
  header: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  useBackLayer(open, () => setOpen(false));
  const selectedRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);
  return (
    <div className="wp-picker">
      <div className="wp-field-header">{header}</div>
      <button className="wp-picker-box wp-tilt" onClick={() => setOpen(true)}>
        {render(value)}
      </button>
      {open && (
        <div className="wp-picker-full wp-turnstile-in">
          <div className="wp-picker-full-title">{header.toUpperCase()}</div>
          <div className="wp-picker-full-list">
            {options.map((o) => (
              <button
                key={String(o)}
                ref={o === value ? selectedRef : undefined}
                className={`wp-picker-option${o === value ? ' selected' : ''}`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {render(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------
 * Message box: a band across the top of the screen with side-by-side buttons.
 * ---------------------------------------------------------------------- */

export function MessageBox({
  open,
  title,
  message,
  buttons,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  buttons: { label: string; onClick: () => void }[];
  onClose: () => void;
}) {
  useBackLayer(open, onClose);
  if (!open) return null;
  return (
    <div className="wp-msgbox-scrim">
      <div className="wp-msgbox" role="alertdialog" aria-label={title}>
        <h2>{title}</h2>
        {message && <div className="wp-msgbox-text">{message}</div>}
        <div className="wp-msgbox-buttons">
          {buttons.map((b) => (
            <button
              key={b.label}
              className="wp-button"
              onClick={() => {
                onClose();
                setTimeout(b.onClick, 60);
              }}
            >
              {b.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------
 * Progress: the indeterminate flying dots, and a determinate thin bar.
 * ---------------------------------------------------------------------- */

export function ProgressDots({ className = '' }: { className?: string }) {
  return (
    <div className={`wp-dots ${className}`} role="progressbar" aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="wp-progress" role="progressbar" aria-valuenow={percent}>
      <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------------
 * Live tile: one face, or several that flip or peek on a timer.
 * ---------------------------------------------------------------------- */

export type TileSize = 'small' | 'medium' | 'wide';

export function Tile({
  size,
  label,
  faces,
  animation = 'flip',
  color,
  onClick,
  onLongPress,
  editing,
  selected,
  badge,
  className = '',
  style,
  children,
}: {
  size: TileSize;
  label?: string;
  faces: ReactNode[];
  animation?: 'flip' | 'peek';
  color?: string;
  onClick?: () => void;
  onLongPress?: () => void;
  editing?: boolean;
  selected?: boolean;
  badge?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  const [face, setFace] = useState(0);
  const count = faces.length;
  useEffect(() => {
    setFace(0);
    if (count < 2 || editing) return;
    // Staggered, slightly random intervals so the grid never flips in unison.
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      t = setTimeout(() => {
        setFace((f) => (f + 1) % count);
        tick();
      }, 5000 + Math.random() * 5000);
    };
    tick();
    return () => clearTimeout(t);
  }, [count, editing]);

  const press = useLongPress(onLongPress ? () => onLongPress() : undefined);
  const showLabel = label && size !== 'small';

  return (
    <div
      className={`wp-tile wp-tile-${size}${editing ? ' editing' : ''}${selected ? ' selected' : ''} ${className}`}
      style={{ ...(color ? { background: color } : null), ...style }}
    >
      <button className="wp-tile-hit wp-tilt" onClick={press.wrapClick(onClick)} {...press.handlers} aria-label={label}>
        <div className={`wp-tile-faces wp-tile-${animation}`} data-face={face}>
          {faces.map((f, i) => (
            <div
              key={i}
              className={`wp-tile-face${i === face ? ' current' : ''}`}
              style={animation === 'peek' ? { transform: `translateY(${(i - face) * 100}%)` } : undefined}
            >
              {f}
            </div>
          ))}
        </div>
        {showLabel && <span className="wp-tile-label">{label}</span>}
        {badge != null && <span className="wp-tile-badge">{badge}</span>}
      </button>
      {children}
    </div>
  );
}

/** A tile face with a centred glyph. */
export function IconFace({ icon }: { icon: ReactNode }) {
  return <div className="wp-face-icon">{icon}</div>;
}
