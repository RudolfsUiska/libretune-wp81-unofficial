import { createContext, useContext } from 'react';
import type { MenuItem, ToolbarItem, Tab } from '../components/tuner-ui';
import type {
  BackendMenu,
  ChannelInfo,
  ConnectionStatus,
  CurrentProject,
  IniCapabilities,
  ProjectInfo,
} from '../types/app';
import type { ConnectionPhase } from '../utils/connectionWorkflow';

/** Everything the Metro shell needs from App's orchestrator. */
export interface MetroShellProps {
  menuItems: MenuItem[];
  backendMenus: BackendMenu[];
  toolbarItems: ToolbarItem[];
  searchIndex: Record<string, string[]>;

  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  /** Kind of content each open tab holds ("table", "dashboard"...). */
  tabTypes: Record<string, string>;

  status: ConnectionStatus;
  connectionPhase: ConnectionPhase;
  ecuType: string;
  connecting: boolean;
  syncing: boolean;
  syncProgress: { current: number; total: number; percent: number } | null;
  syncWarning: string | null;
  /** Runtime packet mode in use (Auto, ForceBurst...). */
  packetMode: string;

  currentProject: CurrentProject | null;
  availableProjects: ProjectInfo[];
  iniCapabilities: IniCapabilities | null;
  tuneModified: boolean;
  isLogging: boolean;
  logDuration: string;

  ports: string[];
  selectedPort: string;
  setSelectedPort: (p: string) => void;
  baudRate: number;
  onBaudChange: (b: number) => void;
  refreshPorts: () => Promise<string[]>;
  connect: () => void;
  disconnect: () => void;

  statusBarChannels: string[];
  channelInfoMap: Record<string, ChannelInfo>;

  actions: {
    openTarget: (name: string, title?: string, highlight?: string) => void | Promise<void>;
    stdTarget: (target: string, label: string) => void;
    helpTopic: (topic: string, label: string) => void;
    openProject: (path: string) => void | Promise<void>;
    deleteProject: (name: string) => void | Promise<void>;
    closeProject: () => void | Promise<void>;
    newProject: () => void;
    importProject: () => void;
    searchIniOnline: () => void;
    saveTune: () => void;
    loadTune: () => void;
    burn: () => void;
    advancedSettings: () => void;
    connectionDialog: () => void;
    about: () => void;
    manual: () => void;
    restorePoints: () => void;
    createRestorePoint: () => void;
  };

  children: React.ReactNode;
}

export interface MetroCtx extends MetroShellProps {
  /** Open a tab target and navigate to its page. */
  open: (target: string, label?: string, highlight?: string) => void;
  /** Open the dashboard page. */
  openDashboard: () => void;
  toggleLogging: () => void;
  canLog: boolean;
  hasDashboard: boolean;
  connected: boolean;
}

export const MetroContext = createContext<MetroCtx | null>(null);

export function useMetro(): MetroCtx {
  const c = useContext(MetroContext);
  if (!c) throw new Error('useMetro outside MetroShell');
  return c;
}

/** Strip INI mnemonics ("&Fuel") and trailing ellipses for display. */
export function cleanLabel(label: string): string {
  // Desktop menu labels also carry their keyboard shortcut ("Burn\tCtrl+B").
  return label
    .split('\t')[0]
    .replace(/\s+(ctrl|alt|shift|cmd)\+\S+$/i, '')
    .replace(/&(?!&)/g, '')
    .replace(/…|\.\.\.$/g, '')
    .trim();
}

/** Tab titles carry the INI name, "VE table (veTableTbl)"; pages needn't. */
export function pageTitle(title: string, id: string): string {
  const suffix = ` (${id})`.toLowerCase();
  const bare = title.toLowerCase().endsWith(suffix) ? title.slice(0, -suffix.length) : title;
  return bare.replace(/^Console - /, 'console ');
}
