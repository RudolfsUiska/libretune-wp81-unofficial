import { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize2 } from 'lucide-react';
import { useFullscreenView, openTabsFullscreen } from '../../utils/viewFullscreen';
import { AppBar, ProgressDots } from '../controls';
import { pageTitle, useMetro } from '../context';
import { nav } from '../nav';
import { isPinned, pinToStart } from '../startLayout';
import { Flame, Glyph, Layers, Save } from '../icons';

/**
 * A page hosting one open tab's editor (table, curve, dialog, dashboard...).
 * The editors themselves are LibreTune's own; the Metro skin restyles them.
 */
export function ContentPage({ tabId }: { tabId: string }) {
  const m = useMetro();
  const tab = m.tabs.find((t) => t.id === tabId);
  const kind = m.tabTypes[tabId];
  const isDash = kind === 'dashboard';
  const [pinned, setPinned] = useState(() => isPinned(tabId));

  useEffect(() => {
    if (tab && m.activeTabId !== tabId) m.onTabSelect(tabId);
    // Only when this page is (re)shown, not on every active-tab change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  // The tab was closed from inside its editor: leave the page.
  const hadTab = useRef(!!tab);
  useEffect(() => {
    if (hadTab.current && !tab) nav.back();
    hadTab.current = !!tab;
  }, [tab]);

  const fs = useFullscreenView(!isDash && openTabsFullscreen.get());
  // Mount the editor once the page has turned in: editors measure themselves
  // on mount, and mid-turnstile the page is rotated.
  const [turned, setTurned] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTurned(true), 360);
    return () => clearTimeout(t);
  }, []);
  const showing = turned && m.activeTabId === tabId;

  if (!tab) return <div className="wp-page" />;

  // Tab titles carry the INI name, "VE table (veTableTbl)"; the page needn't.
  const title = pageTitle(tab.title, tabId);
  const pending = m.connected && m.tuneModified;

  return (
    <div className={`wp-page wp-content-page${isDash ? ' dash' : ''}${fs.fullscreen ? ' fs' : ''}`}>
      {!isDash && !fs.fullscreen && (
        <header className="wp-header wp-header-compact">
          <div className="wp-header-app">LIBRETUNE{m.status.signature ? ` · ${m.connected ? 'ONLINE' : 'OFFLINE'}` : ''}</div>
          <h1 className="wp-header-title">{title.toLowerCase()}</h1>
        </header>
      )}
      <div className="wp-content" data-kind={kind}>
        {showing ? <div className="wp-content-in">{m.children}</div> : <ProgressDots />}
      </div>
      {fs.fullscreen && (
        <button className="wp-fs-exit wp-round" onClick={fs.exit} aria-label="Exit fullscreen">
          <Minimize2 size={18} strokeWidth={1.8} />
        </button>
      )}
      {!fs.fullscreen && (
        <AppBar
          mode="minimal"
          buttons={[
            {
              id: 'burn',
              icon: <Glyph icon={Flame} size={20} />,
              label: 'burn',
              onClick: m.actions.burn,
              disabled: !pending,
              alert: pending,
            },
            { id: 'save', icon: <Glyph icon={Save} size={20} />, label: 'save', onClick: m.actions.saveTune },
            { id: 'full', icon: <Maximize size={20} strokeWidth={1.5} />, label: 'full screen', onClick: fs.enter },
            { id: 'pages', icon: <Glyph icon={Layers} size={20} />, label: 'pages', onClick: () => nav.push({ kind: 'tasks' }) },
          ]}
          menu={[
            {
              id: 'pin',
              label: pinned ? 'pinned to start' : 'pin to start',
              disabled: pinned,
              onClick: () => {
                pinToStart(tabId, pageTitle(tab.title, tabId), kind);
                setPinned(true);
              },
            },
            ...(m.canLog
              ? [{ id: 'log', label: m.isLogging ? 'stop logging' : 'start logging', onClick: m.toggleLogging }]
              : []),
            { id: 'load', label: 'load tune', onClick: m.actions.loadTune },
            { id: 'start', label: 'go to start', onClick: () => nav.home() },
            ...(tab.closable !== false
              ? [{ id: 'close', label: 'close page', onClick: () => m.onTabClose(tabId) }]
              : []),
          ]}
        />
      )}
    </div>
  );
}
