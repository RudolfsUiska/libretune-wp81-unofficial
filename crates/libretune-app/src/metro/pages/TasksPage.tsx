import { useEffect, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { pageTitle, useMetro } from '../context';
import { nav } from '../nav';
import { iconForKind } from '../icons';
import { iconForLabel } from '../itemIcons';
import { pruneSnapshots, useSnapshots } from '../snapshots';
import { byRecent } from '../recentPages';

/**
 * The 8.1 task switcher, for open pages: cards in a horizontal strip, each
 * with its name above and a close button. A card shows a picture of the page
 * as it was last seen (Android; see snapshots.ts), or the page's icon until
 * there is one. Most recently shown pages come first. Tap a card to go back
 * to it.
 */
export function TasksPage() {
  const m = useMetro();
  // Most recently shown first, as on the phone.
  const tabs = byRecent(m.tabs, (t) => t.id);
  const shotOf = useSnapshots();
  const ids = tabs.map((t) => t.id).join('\n');
  // Pictures are of the whole screen; cards take its shape.
  const screenRatio = `${Math.max(1, window.innerWidth)} / ${Math.max(1, window.innerHeight)}`;

  // Closed pages leave no pictures behind.
  useEffect(() => {
    pruneSnapshots(ids ? ids.split('\n') : []);
  }, [ids]);

  return (
    <div className="wp-page wp-tasks">
      <div className="wp-header-app wp-tasks-title">OPEN PAGES</div>
      {tabs.length === 0 ? (
        <p className="wp-empty-text">Nothing is open. Tables, dialogs and tools you open appear here.</p>
      ) : (
        <div className="wp-tasks-strip">
          {tabs.map((t) => {
            const kind = m.tabTypes[t.id];
            const title = pageTitle(t.title, t.id);
            const Icon = iconForLabel(title, iconForKind(kind), t.id);
            const shot = shotOf(t.id);
            return (
              <div key={t.id} className={`wp-task${t.id === m.activeTabId ? ' current' : ''}`}>
                <div className="wp-task-caption">
                  <span className="wp-task-icon">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="wp-task-name">{title}</span>
                  {t.closable !== false && (
                    <button className="wp-task-close" onClick={() => m.onTabClose(t.id)} aria-label={`Close ${t.title}`}>
                      <X size={16} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <button
                  className={`wp-task-card wp-tilt${shot ? ' has-shot' : ''}`}
                  aria-label={`Go to ${title}`}
                  style={shot ? ({ '--shot-ratio': screenRatio } as CSSProperties) : undefined}
                  onClick={() => {
                    m.onTabSelect(t.id);
                    nav.replace({ kind: 'page', tabId: t.id });
                  }}
                >
                  {shot ? (
                    <img className="wp-task-shot" src={shot} alt="" draggable={false} />
                  ) : (
                    <>
                      <span className="wp-task-mini-app">LIBRETUNE</span>
                      <span className="wp-task-mini-title">{title.toLowerCase()}</span>
                      <Icon className="wp-task-glyph" size={96} strokeWidth={1} />
                      <span className="wp-task-kind">{kind ?? ''}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
