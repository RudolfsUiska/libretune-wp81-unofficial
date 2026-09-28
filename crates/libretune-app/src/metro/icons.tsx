import {
  Activity,
  Cable,
  FileText,
  Flame,
  FolderOpen,
  Gauge,
  Grid3x3,
  HelpCircle,
  LayoutGrid,
  Layers,
  ListChecks,
  Microscope,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Spline,
  Terminal,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Thin strokes, like the Segoe UI Symbol glyphs WP used. */
export const STROKE = 1.5;

export function Glyph({ icon: Icon, size = 22 }: { icon: LucideIcon; size?: number }) {
  return <Icon size={size} strokeWidth={STROKE} aria-hidden />;
}

/** The icon for an open page, by its tab content kind. */
export function iconForKind(kind: string | undefined): LucideIcon {
  switch (kind) {
    case 'dashboard':
      return Gauge;
    case 'table':
      return Grid3x3;
    case 'curve':
      return Spline;
    case 'dialog':
    case 'portEditor':
      return ListChecks;
    case 'autotune':
      return Wand2;
    case 'datalog':
    case 'datalog-viewer':
      return Activity;
    case 'tooth-logger':
    case 'composite-logger':
      return Microscope;
    case 'console':
    case 'lua-console':
      return Terminal;
    case 'och-status':
      return LayoutGrid;
    case 'settings':
      return Settings;
    default:
      return FileText;
  }
}

/** Icons for the desktop toolbar ids, reused in app bars. */
export const TOOLBAR_ICONS: Record<string, LucideIcon> = {
  open: FolderOpen,
  save: Save,
  burn: Flame,
  connect: Cable,
  realtime: Gauge,
  settings: Settings,
  'log-start': Activity,
};

export { Activity, Cable, Flame, FolderOpen, Gauge, HelpCircle, Layers, Save, Search, Settings, SlidersHorizontal, Terminal, Wand2, Wrench };
