import {
  Activity,
  ArchiveRestore,
  AudioWaveform,
  BatteryMedium,
  BookOpen,
  Bot,
  Cable,
  Calculator,
  Car,
  CircleGauge,
  Cog,
  Compass,
  Copy,
  Cpu,
  Crosshair,
  Download,
  Droplets,
  Ear,
  Fan,
  FileText,
  Flame,
  FolderOpen,
  Fuel,
  Gamepad2,
  Gauge,
  GitCompare,
  Globe,
  Grid3x3,
  HardDrive,
  HelpCircle,
  History,
  Hourglass,
  Info,
  Key,
  Keyboard,
  Languages,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  Microscope,
  Network,
  Palette,
  Plug,
  Power,
  Puzzle,
  Radar,
  Radio,
  Rocket,
  RotateCcw,
  RotateCw,
  Ruler,
  Save,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Spline,
  Syringe,
  Target,
  Terminal,
  Thermometer,
  ThermometerSun,
  Timer,
  ToggleLeft,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wand2,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * An icon for a list row, chosen from its label (and target id): the ECU's
 * own menus (fuel, ignition, idle...), LibreTune's commands (save, burn,
 * logging...) and the shell's pages. First matching rule wins, so the more
 * specific words come first ("knock retard" is knock, not ignition).
 *
 * The words are English: INI labels are passed through verbatim, and the app
 * chrome's source strings are English. A translated label that matches
 * nothing falls back to the item's kind (table, dialog...).
 */
const RULES: [RegExp, LucideIcon][] = [
  // LibreTune commands and shell pages
  [/\bburn\b/, Flame],
  [/\bsave\b|save as/, Save],
  [/\b(open|load)\b.*\b(tune|project|msq|file)|\bprojects?\b|browse/, FolderOpen],
  [/\bexport\b/, Upload],
  [/\bimport\b/, Download],
  [/restore point|\brestore\b|backup/, ArchiveRestore],
  [/history|version|git\b|commit/, History],
  [/compare|\bdiff\b/, GitCompare],
  [/\breset\b|defaults?\b/, RotateCcw],
  [/\bdelete\b|\bremove\b|clear/, Trash2],
  [/copy|duplicate/, Copy],
  [/\bai\b|assistant|\bagent\b|\bmcp\b/, Bot],
  [/plugin|extension/, Puzzle],
  [/theme|colou?r|accent|appearance|wallpaper|background/, Palette],
  [/language|translation/, Languages],
  [/hotkey|keyboard|shortcut/, Keyboard],
  [/\bunits?\b/, Ruler],
  [/user manual|manual$|documentation|\bdocs?\b|guide|tutorial/, BookOpen],
  [/\babout\b|vehicle information|\binfo\b/, Info],
  [/\bhelp\b|faq/, HelpCircle],
  [/open pages|\bpages\b|\btasks?\b/, Layers],
  [/online|download.*ini|repository|website/, Globe],
  [/\bconnect|connection|\bport\b|serial|baud|usb/, Cable],
  [/\bstart screen\b|\bstart\b.*tile/, LayoutDashboard],
  // Logging and diagnostics
  [/tooth|composite|trigger log/, Microscope],
  [/console|terminal|\blua\b|command line/, Terminal],
  [/sd card|card logger|storage/, HardDrive],
  [/\blog|datalog|record|playback/, Activity],
  [/dyno|torque|performance/, Rocket],
  [/scope|oscillo|\bsent\b/, AudioWaveform],
  [/stimulat|simulat|test mode|hardware test|bench/, Wrench],
  [/math|calculat|formula|expression|channel editor/, Calculator],
  [/autotune|auto tune|\bve analy|wizard/, Wand2],
  [/realtime|dashboard|gauge|front ?page|display/, Gauge],
  // ECU: specific systems first
  [/knock/, Ear],
  [/nitrous/, Zap],
  [/launch|anti-?lag|\bals\b|flat shift|shift torque/, Rocket],
  [/boost|turbo|wastegate|\bmap\b.*sensor|manifold pressure|baro/, Wind],
  [/vvt|\bcam\b|camshaft|variable valve/, RotateCw],
  [/trigger|crank sensor|\bdecoder\b|tooth|wheel/, Compass],
  [/cranking|crank|starter|prim(ing|e)/, Key],
  [/after-?start|warm ?up|enrichment.*clt|\bclt\b.*enrich/, ThermometerSun],
  [/fan\b|fans\b|cooling/, Fan],
  [/air ?con|\bac\b|a\/c/, Snowflake],
  [/idle/, Hourglass],
  [/wideband|\bo2\b|lambda|\bafr\b|ego|oxygen|closed.?loop fuel|fuel trim/, Droplets],
  [/injector|inject|\bpw\b|pulse ?width|staging|dead ?time/, Syringe],
  [/fuel pump|high pressure fuel|\bhpfp\b|\bpump/, Fuel],
  [/accel(?!erometer|erator)|\btps\b.*(enrich|accel)|wall fuel|\btau\b|\bae\b/, TrendingUp],
  [/decel|dfco|fuel cut|overrun/, TrendingDown],
  [/\bve\b|volumetric|\bfuel\b|\bmaf\b|airmass|req.?fuel|e85|flex/, Fuel],
  [/dwell|coil|spark|ignition|timing|advance|\bign\b/, Zap],
  [/throttle|\btps\b|pedal|\betb\b|electronic throttle|dc motor/, SlidersHorizontal],
  [/rev limit|\brpm\b limit|limiter|over-?rev|protection|safety|lambda monitor/, ShieldAlert],
  [/\begt\b|exhaust gas/, Flame],
  [/\bclt\b|coolant|\biat\b|intake air|temperature|temp\b|thermistor/, Thermometer],
  [/battery|alternator|voltage|charging|main relay/, BatteryMedium],
  [/\bcan\b|can-?bus|canbus|obd|serial bus|lin\b/, Network],
  [/button box|virtual button|gamepad|joystick/, Gamepad2],
  [/vehicle speed|\bvss\b|\bspeed\b|gear|transmission|\btcu\b|tcm/, Car],
  [/accelerometer|imu|g-?force/, Radar],
  [/sensor|calibrat|\badc\b|analog|input/, Crosshair],
  [/output|programmable|\bpins?\b|\bports?\b|relay|switch|\bgpio\b/, Plug],
  [/\bmcu\b|\bcpu\b|controller|\bboard\b|firmware|mc33|tle\d|chip|adc devices/, Cpu],
  [/rotary|odd fire|cylinder|engine|constants|basic|base|setup/, Cog],
  [/target/, Target],
  [/radio|telemetry|wifi|bluetooth/, Radio],
  [/table/, Grid3x3],
  [/curve|correction|multiplier|taper|blend/, Spline],
  [/timer|delay|latency/, Timer],
  [/toggle|enable/, ToggleLeft],
  [/lock|security|password/, Lock],
  [/power|shutdown/, Power],
  [/waves?|filter|smoothing/, Waves],
  [/gauge/, CircleGauge],
  [/experimental|expert|extra|advanced|tunables/, Sparkles],
  [/settings|options|preferences|config/, Settings],
];

/** The icon for a label, or `fallback` when no word matches. */
export function iconForLabel(label: string, fallback: LucideIcon = FileText, target?: string): LucideIcon {
  const text = `${label} ${target ?? ''}`.toLowerCase().replace(/[_&]/g, ' ').trim();
  for (const [re, icon] of RULES) if (re.test(text)) return icon;
  return fallback;
}

/** Fallback by INI menu item type. */
export function iconForMenuType(type: string | undefined): LucideIcon {
  switch (type) {
    case 'Table':
      return Grid3x3;
    case 'Help':
      return HelpCircle;
    case 'Std':
      return Sparkles;
    default:
      return ListChecks;
  }
}
