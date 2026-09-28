import { useCallback, useEffect, useMemo, useRef } from 'react';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { MetroContext, type MetroCtx, type MetroShellProps } from './context';
import { nav, useNav, type Route } from './nav';
import { applyMetroPrefs } from './theme';
import { installTilt } from './tilt';
import { installLegacyModalBack } from './legacyModals';
import { StartPage } from './pages/StartPage';
import { AppsPage } from './pages/AppsPage';
import { TunePage } from './pages/TunePage';
import { ContentPage } from './pages/ContentPage';
import { TasksPage } from './pages/TasksPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ConnectPage } from './pages/ConnectPage';
import { SettingsPage, ThemePage } from './pages/SettingsPages';
import './metro.css';
import './metro-skin.css';

/**
 * The Windows Phone 8.1 shell that replaces the desktop layout (menu bar,
 * toolbar, sidebar, tab strip, status bar). App.tsx keeps all the state and
 * backend logic and hands it over as props; this file only decides what is
 * on screen and how you move between pages.
 */
export function MetroShell(props: MetroShellProps) {
  const { tabs, activeTabId, onTabSelect, actions, toolbarItems, iniCapabilities, currentProject } = props;
  const snap = useNav();
  const top = snap.routes[snap.routes.length - 1];

  useEffect(() => {
    nav.install();
    installTilt();
    applyMetroPrefs();
    return installLegacyModalBack();
  }, []);

  // A target opened from the shell navigates to its page once App has made
  // (or selected) the tab. Opening can fail with a toast, hence the timeout.
  const pending = useRef(0);
  const open = useCallback(
    (target: string, label?: string, highlight?: string) => {
      if (tabs.some((t) => t.id === target) && !highlight) {
        onTabSelect(target);
        nav.push({ kind: 'page', tabId: target });
        return;
      }
      pending.current = Date.now();
      void actions.openTarget(target, label, highlight);
    },
    [tabs, onTabSelect, actions],
  );

  const openDashboard = useCallback(() => {
    if (tabs.some((t) => t.id === 'dashboard')) {
      onTabSelect('dashboard');
      nav.push({ kind: 'page', tabId: 'dashboard' });
      return;
    }
    pending.current = Date.now();
    actions.stdTarget('std_realtime', 'Dashboard');
  }, [tabs, onTabSelect, actions]);

  // Tabs opened by the editors themselves (a dialog's "edit curve" button, the
  // connect wizard...) also get a page. Tabs restored at launch do not: the
  // phone opens on Start.
  const prevTabs = useRef<string[]>([]);
  useEffect(() => {
    const ids = tabs.map((t) => t.id);
    const prev = prevTabs.current;
    prevTabs.current = ids;
    if (!activeTabId || !ids.includes(activeTabId)) return;
    const isNew = prev.length > 0 && !prev.includes(activeTabId);
    const requested = Date.now() - pending.current < 6000;
    if (isNew || requested) {
      pending.current = 0;
      nav.push({ kind: 'page', tabId: activeTabId });
    }
  }, [tabs, activeTabId]);

  // Closing the project leaves nothing to show above Start.
  const hadProject = useRef(!!currentProject);
  useEffect(() => {
    if (hadProject.current && !currentProject) nav.reset({ kind: 'start' });
    hadProject.current = !!currentProject;
  }, [currentProject]);

  const logItem = toolbarItems.find((t) => t.id === 'log-start');
  const toggleLogging = useCallback(() => logItem?.onClick?.(), [logItem]);

  const ctx: MetroCtx = useMemo(
    () => ({
      ...props,
      // The backend may answer with nothing before its first scan.
      availableProjects: props.availableProjects ?? [],
      ports: props.ports ?? [],
      tabs: props.tabs ?? [],
      open,
      openDashboard,
      toggleLogging,
      canLog: !!(iniCapabilities?.has_datalog_entries || iniCapabilities?.has_output_channels),
      hasDashboard: !!(iniCapabilities?.has_frontpage || iniCapabilities?.has_gauges),
      connected: props.status.state === 'Connected',
    }),
    [props, open, openDashboard, toggleLogging, iniCapabilities],
  );

  return (
    <MetroContext.Provider value={ctx}>
      <div className={`wp-shell${top.route.kind === 'page' ? ' on-page' : ''}`}>
        {/* No WP status bar: pulling it down also pulled down Android's own
            notification shade. The tiles carry the connection, recording and
            burn state; this line announces the link to screen readers. */}
        <div className="wp-sr-only" role="status" aria-live="polite">
          ECU {props.connectionPhase}
        </div>
        <main className="wp-stage">
          <div key={top.key} className={`wp-stage-page ${snap.direction > 0 ? 'fwd' : 'back'}`}>
            <ErrorBoundary>{renderRoute(top.route)}</ErrorBoundary>
          </div>
        </main>
      </div>
    </MetroContext.Provider>
  );
}

function renderRoute(r: Route) {
  switch (r.kind) {
    case 'start':
      return <StartPage />;
    case 'apps':
      return <AppsPage />;
    case 'tune':
      return <TunePage menu={r.menu} />;
    case 'page':
      return <ContentPage tabId={r.tabId} />;
    case 'tasks':
      return <TasksPage />;
    case 'projects':
      return <ProjectsPage />;
    case 'connect':
      return <ConnectPage />;
    case 'settings':
      return <SettingsPage />;
    case 'theme':
      return <ThemePage />;
  }
}
