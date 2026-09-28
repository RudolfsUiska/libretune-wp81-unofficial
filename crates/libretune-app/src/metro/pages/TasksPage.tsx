import { X } from 'lucide-react';
import { pageTitle, useMetro } from '../context';
import { nav } from '../nav';
import { iconForKind } from '../icons';

/**
 * The 8.1 task switcher, for open pages: cards in a horizontal strip, each
 * with its name above and a close button. Tap a card to go back to it.
 */
export function TasksPage() {
  const m = useMetro();
  const tabs = m.tabs;

  return (
    <div className="wp-page wp-tasks">
      <div className="wp-header-app wp-tasks-title">OPEN PAGES</div>
      {tabs.length === 0 ? (
        <p className="wp-empty-text">Nothing is open. Tables, dialogs and tools you open appear here.</p>
      ) : (
        <div className="wp-tasks-strip">
          {tabs.map((t) => {
            const kind = m.tabTypes[t.id];
            const Icon = iconForKind(kind);
            return (
              <div key={t.id} className={`wp-task${t.id === m.activeTabId ? ' current' : ''}`}>
                <div className="wp-task-caption">
                  <span className="wp-task-icon">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="wp-task-name">{pageTitle(t.title, t.id)}</span>
                  {t.closable !== false && (
                    <button className="wp-task-close" onClick={() => m.onTabClose(t.id)} aria-label={`Close ${t.title}`}>
                      <X size={16} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <button
                  className="wp-task-card wp-tilt"
                  onClick={() => {
                    m.onTabSelect(t.id);
                    nav.replace({ kind: 'page', tabId: t.id });
                  }}
                >
                  <span className="wp-task-mini-app">LIBRETUNE</span>
                  <span className="wp-task-mini-title">{pageTitle(t.title, t.id).toLowerCase()}</span>
                  <Icon className="wp-task-glyph" size={96} strokeWidth={1} />
                  <span className="wp-task-kind">{kind ?? ''}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
