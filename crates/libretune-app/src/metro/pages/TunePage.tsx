import { useState } from 'react';
import { ChevronRight, HelpCircle, ListChecks, Grid3x3, Search, Sparkles } from 'lucide-react';
import type { BackendMenuItem } from '../../types/app';
import { AppBar, ContextMenu, ListItem, Pivot } from '../controls';
import { cleanLabel, useMetro } from '../context';
import { nav } from '../nav';
import { pinToStart } from '../startLayout';
import { Glyph, Layers } from '../icons';

const LAST = 'libretune.metro.tunePivot';

/** The ECU's own menus (Fuel, Ignition, ...), one pivot item each. */
export function TunePage({ menu }: { menu?: string }) {
  const m = useMetro();
  const menus = m.backendMenus.filter((b) => b.items.some((i) => i.visible !== false && i.type !== 'Separator'));
  const initial = (() => {
    const byName = menu ? menus.findIndex((b) => b.name === menu) : -1;
    if (byName >= 0) return byName;
    const saved = Number(sessionStorage.getItem(LAST));
    return Number.isFinite(saved) && saved < menus.length ? saved : 0;
  })();
  const [sel, setSel] = useState(initial);
  const [ctx, setCtx] = useState<{ rect: DOMRect; item: BackendMenuItem } | null>(null);

  const choose = (i: number) => {
    setSel(i);
    try {
      sessionStorage.setItem(LAST, String(i));
    } catch {
      // ignore
    }
  };

  const activate = (item: BackendMenuItem) => {
    const label = cleanLabel(item.label || item.target || '');
    if (!item.target) return;
    if (item.type === 'Std') m.actions.stdTarget(item.target, label);
    else if (item.type === 'Help') m.actions.helpTopic(item.target, label);
    else m.open(item.target, label);
  };

  const renderItems = (items: BackendMenuItem[], depth = 0): React.ReactNode[] =>
    items
      .filter((i) => i.visible !== false)
      .flatMap((item, idx) => {
        if (item.type === 'Separator') {
          return item.label ? [<div key={`s${depth}-${idx}`} className="wp-group-header">{cleanLabel(item.label).toLowerCase()}</div>] : [];
        }
        if (item.type === 'SubMenu') {
          return [
            <div key={`g${depth}-${idx}`} className="wp-group">
              <div className="wp-group-header">{cleanLabel(item.label || '').toLowerCase()}</div>
              {renderItems(item.items ?? [], depth + 1)}
            </div>,
          ];
        }
        const label = cleanLabel(item.label || item.target || '');
        const Icon = item.type === 'Table' ? Grid3x3 : item.type === 'Help' ? HelpCircle : item.type === 'Std' ? Sparkles : ListChecks;
        return [
          <ListItem
            key={`${item.target}-${depth}-${idx}`}
            title={label.toLowerCase()}
            subtitle={item.enabled === false ? 'not available with current settings' : kindLabel(item.type)}
            icon={<Icon size={20} strokeWidth={1.5} />}
            disabled={item.enabled === false}
            onClick={() => activate(item)}
            onLongPress={item.type === 'Table' || item.type === 'Dialog' ? (rect) => setCtx({ rect, item }) : undefined}
            trailing={item.type === 'Help' ? <ChevronRight size={18} className="wp-subtle" /> : undefined}
          />,
        ];
      });

  if (menus.length === 0) {
    return (
      <div className="wp-page">
        <div className="wp-header-app wp-pivot-app">LIBRETUNE</div>
        <h1 className="wp-header-title">tune</h1>
        <p className="wp-empty-text">
          {m.currentProject ? 'This ECU definition has no tuning menus yet. Connect to the ECU, or check the project INI.' : 'Open a project first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="wp-page wp-page-pivot">
      <Pivot
        title={`LIBRETUNE${m.currentProject ? ` · ${m.currentProject.name.toUpperCase()}` : ''}`}
        selected={sel}
        onSelect={choose}
        items={menus.map((b) => ({
          key: b.name,
          header: cleanLabel(b.title),
          content: <div className="wp-list">{renderItems(b.items)}</div>,
        }))}
      />
      <ContextMenu
        anchor={ctx?.rect ?? null}
        onClose={() => setCtx(null)}
        items={
          ctx
            ? [
                { id: 'open', label: 'open', onClick: () => activate(ctx.item) },
                {
                  id: 'pin',
                  label: 'pin to start',
                  onClick: () =>
                    pinToStart(ctx.item.target!, cleanLabel(ctx.item.label || ctx.item.target!), ctx.item.type === 'Table' ? 'table' : 'dialog'),
                },
              ]
            : []
        }
      />
      <AppBar
        buttons={[
          { id: 'search', icon: <Search size={20} strokeWidth={1.6} />, label: 'search', onClick: () => nav.push({ kind: 'apps' }) },
          { id: 'pages', icon: <Glyph icon={Layers} size={20} />, label: 'pages', onClick: () => nav.push({ kind: 'tasks' }) },
        ]}
        menu={[
          { id: 'save', label: 'save tune', onClick: m.actions.saveTune },
          { id: 'burn', label: 'burn to ecu', onClick: m.actions.burn, disabled: !m.connected || !m.tuneModified },
        ]}
      />
    </div>
  );
}

function kindLabel(t: BackendMenuItem['type']): string {
  switch (t) {
    case 'Table':
      return 'table';
    case 'Dialog':
      return 'settings';
    case 'Help':
      return 'help';
    case 'Std':
      return 'tool';
    default:
      return '';
  }
}
