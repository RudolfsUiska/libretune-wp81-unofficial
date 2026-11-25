# LibreTune WP: Windows Phone 8.1 UI

This folder is a copy of `work/LibreTune` (the Android port, see
`ANDROID_USB_HANDOFF.md`) whose user interface was rewritten in the Windows
Phone 8.1 "Metro" design language. The backend, the ECU protocol, the USB driver
and the editors' logic are unchanged.

It installs **next to** the original app: package `com.libretune.wp`, launcher
name "LibreTune WP", a cobalt tachometer tile icon. Its data directory is
separate, so projects must be imported or created again in it.

```bash
bash scripts/build-android.sh --install   # builds, installs com.libretune.wp, launches it
```

## What changed

| Desktop LibreTune | LibreTune WP |
|---|---|
| menu bar, toolbar, sidebar | **Start**: live tiles (ECU link with live RPM/CLT/AFR, dashboard, tune, log, burn, save...) |
| INI menus in the sidebar | **tune** page: a pivot, one item per ECU menu (fuel, ignition...) |
| File/Edit/View/Tools/Help | **all commands**: alphabetical app list with letter jump grid and search (swipe left on Start, or the arrow) |
| tab strip | pages with a back stack; **open pages** is the 8.1 task switcher |
| status bar | none: the tiles show connection, recording and burn state (a WP status bar with a pull-down action centre was removed, because pulling it down also opened Android's notification shade) |
| toolbar buttons | round-icon **app bars**, "..." for labels and menu |
| toasts | WP toast band across the top |
| spinner | flying-dots progress |
| themes | **start+theme**: dark/light background plus the 20 WP accent colours; "show more tiles" |
| UI scale | **display density** (Settings); the editors' compact phone modes are always on |

Also Metro-native: the **connection** page (port radio list, baud list picker,
packet mode and link metrics), **projects**, **settings**, turnstile page
transitions, tilt-on-press, tile flip/peek animations, long-press context menus,
and message boxes.

**Start customisation** works as on the phone. Long-press a tile to enter edit
mode, then unpin it, resize it (medium → small → wide), or drag it to move it.
Any table or dialog can be pinned to Start from its page's "..." menu, or by
long-pressing it in the tune pivot or all-commands list.

The editors themselves (tables, curves, INI dialogs, AutoTune, logging,
dashboards, all the dialogs) are LibreTune's own components. `metro-skin.css`
restyles them: square corners, no shadows, Segoe-style type, WP text boxes,
check boxes and sliders, and pivot-style dialog tabs. Every modal becomes a WP
message box anchored at the top.

**Back** (Android) walks the page stack, closes the app bar, pickers and tile
edit mode, and closes LibreTune's own dialogs first
(`legacyModals.ts`). With nothing left, it backgrounds the app, as before.
MainActivity asks the page first (`window.__metroBack` in `nav.ts`) rather
than trusting `webView.canGoBack()`/`goBack()`. The WebView skips history
entries that were created without a tap, such as the app list opened by a swipe
right after launch, and Back then left the app.

## Themes

The **start+theme** background is LibreTune's theme: dark, light, midnight,
carbon, synthwave, solarized, nord, dracula and high contrast. Each is a Metro
palette in `metro.css` (`html[data-metro='<theme>']`) and brings its own accent
colour; choosing one of the 20 WP accents afterwards overrides that accent.
`ThemeProvider` (themes/theme-context.tsx) reads and writes the same Metro
prefs, so Settings > all settings > appearance and start+theme are one
setting. Text on the accent turns black on pale accents (`--wp-on-accent`, high
contrast yellow). `index.html` repeats the theme accents so the first paint is
right; keep it in step with `THEME_LOOK` in `metro/theme.ts`.

## Start background (tile wallpaper)

As on Windows Phone 8.1, a picture can show **through the tiles**. It isn't
drawn around them, and it scrolls at 30% of Start's speed (parallax). Tiles
that carry a colour of their own (burn pending, recording) stay solid.

Choose one in start+theme > start background: none, six built-ins (aurora,
sunset, night drive, carbon fibre, redline, accent glow), or a photo from the
phone. The built-ins are CSS gradients, so they cost nothing to ship. A photo
is downscaled to at most 1600 px and kept as a JPEG data URL in localStorage.

Code: `metro/wallpaper.ts`. On Start it is one picture layer behind the
tiles, masked to the tile rectangles (`useStartWallpaper`, an SVG mask rebuilt
only when the layout changes). A CSS scroll-driven animation
(`animation-timeline: scroll()`) moves the picture, so the compositor keeps it
in step with the scroll. An earlier version moved it from a scroll listener and
lagged behind the finger. Without scroll timelines it falls back to a
transform set on scroll. The start+theme preview does not scroll and positions
the picture per tile (`useWallpaperGeometry`).

## Classic dashboards fill the screen

TunerStudio places gauges at fractions of the window and stretches the dash to
any size. LibreTune forced a shape (square unless the file says otherwise) and
a 600 px minimum width, so on a phone it scrolled or shrank. In this build,
`DashboardCanvas` gets `fill` (`TsDashboard`, whenever the phone layout is on).
The dash takes the whole area; a file with *force aspect* keeps its shape and
is fitted, centred (container units on `.ts-dashboard-wrapper--fill`). Gauge
minimum sizes (desktop pixels) are ignored when filling.

Stretched to a tall screen, some gauges become tall and narrow, and painters
size text from height, so titles ran off the sides. `gauges/fitText.ts`
(installed by `useGaugeRenderer`) squeezes a line horizontally with the
canvas `maxWidth` when it would cross the gauge's edge. It accounts for text
alignment and the current transform, and leaves rotated text alone.

## Windows 8.1 dashboard

"Windows 8.1" (`builtin:windows-81`) is listed first under Built-in in the
dashboard selector. It's in `components/dashboards/win81/`.

It's laid out like the Windows 8.1 Start screen: an "Engine" title, the clock,
and an account-style status tile that counts alerts. The tiles are:

- RPM: large, with the last ~15 s as a graph, advance, and a segmented meter.
- Boost: wide, with a meter centred on zero.
- AFR, peeking to lambda.
- Coolant, with a bar.
- Four small tiles: battery, speed, IAT and TPS.

Tiles use the Windows 8 colours and turn red past the shared `LIMITS` in
`engineReadings.ts`. The background is the app accent darkened, as Start
followed the personalisation colour. The grid is 8×4 in landscape and 4×8 in
portrait, in container units. Logic and tests are in `win81Logic.ts` and
`__tests__/`.

## Zune dashboard

"Zune" (`builtin:zune`) is listed right after Windows 8.1. It's in
`components/dashboards/zune/`, styled after the Zune HD "now playing" screen
and the Zune desktop software:

- black, with the featured reading drifting in huge faint type behind everything;
- a pivot of giant lowercase words (engine, boost, mixture, coolant, battery)
  that runs off the right edge, the featured one first and white;
- the featured reading as square "album art" in the Zune magenta-to-orange,
  with its last ~15 s drawn across it;
- the other readings as a track list (speed, intake air, throttle and advance
  are list-only), and a thin scrubber line as the meter, with the red mark.

Tap a pivot word or a list row to feature that reading; the choice is kept in
localStorage (`libretune.zune.featured`). Alerts use the Windows 8.1 dash's
rules (`alerts` in `win81Logic.ts`, limits from `engineReadings.ts`): the art,
meter and row turn red, and the screen never switches on its own. AFR out of
band only turns orange. The art sits beside the list in landscape and above it
in portrait.

## CYD Cluster dashboard

"CYD Cluster" (`builtin:cyd-cluster`) is a car-cluster layout after the look of
[muki01/Car-Dashboard-ESP32-CYD](https://github.com/muki01/Car-Dashboard-ESP32-CYD),
an LVGL dashboard for the ESP32 "Cheap Yellow Display". That project is
GPL-3.0 and LibreTune is GPL-2.0-only, so **no code, fonts or icons were taken**:
the layout was redrawn from its screenshots as original SVG/CSS in
`components/dashboards/cyd/`.

- **Cluster page**: a 270° rev arc (cyan, red from `SHIFT_RPM` = red line −500),
  a 0-8 tick ring with the red zone from `LIMITS.rpm.red`, speed in the middle
  (rpm when the ECU has no speed channel), a gear box under it that becomes a
  blinking shift arrow, and coolant / battery / AFR / intake in the corners.
  Coolant reads cyan while cold and red when hot.
- **Engine page**: six ring gauges: throttle, MAP, AFR, intake, timing, injector duty.
- Swipe or tap the dots to change page (kept in `libretune.cyd.page`).
- Alerts (shared `alerts` rules) drop an amber banner; tap to dismiss until the set
  of alerts changes. Gear reads `detectedGear`/`tcuCurrentGear` (rusEFI).
- Numerals use Android's condensed Roboto (`sans-serif-condensed`); no font is bundled.
- The cluster page is titled "Šķieneru Sniegums" (page 2 stays "Engine").
- Top-bar switches (`useDashSwitches.ts`): **LOG** uses the shell's own logging
  toggle, so it always agrees with App's logging poll. **AUTOTUNE** follows
  `get_autotune_status`; switching it off calls `stop_autotune`, switching it on
  opens the AutoTune page rather than starting a session, because starting needs
  the table choice and the preflight safety check there. Both are disabled offline.

## List icons

Every Metro list row carries an icon chosen from its words
(`metro/itemIcons.ts`, first matching rule wins, specific words first):
the tune pivot (ECU menus: fuel, ignition, idle, knock, boost, cranking...), the
all-commands list (the letter square became an icon; the menu path is the
second guess), settings, and the open-pages captions. Unmatched rows fall back
to their kind (table, dialog, help). Add words to `RULES` as new menus turn up;
`__tests__/itemIcons.test.ts` pins real INI labels.

## Page previews in "open pages"

As on the phone, the switcher shows a picture of each open page
(`metro/snapshots.ts`). Android draws the WebView into a small JPEG through a
JS bridge (`SnapshotBridge` in `MainActivity.kt`, `window.LibreTuneNative`),
answering asynchronously through `window.__metroSnapshotDone` so the page never
blocks on its own drawing. A page captures itself 1.2 s after it appears, every
20 s while it stays open, and just before its **pages** button opens the
switcher. Pictures are kept in memory only and dropped when the page closes;
without the bridge (desktop, tests) the cards keep their icon look.

## Where the code is

```
crates/libretune-app/src/metro/
  MetroShell.tsx      shell: routes, open-page logic, screen-reader link status
  nav.ts              back stack on top of browser history (Android Back = popstate)
  controls.tsx        AppBar, Pivot, Tile, ListItem, ToggleSwitch, ListPicker,
                      MessageBox, ContextMenu, ProgressDots/Bar, PageHeader
  pages/              Start, Apps (all commands), Tune, Content (hosts an editor),
                      Tasks, Projects, Connect, Settings + Theme
  theme.ts            background/accent/density prefs (localStorage libretune.metro)
  startLayout.ts      tile order/sizes and pins (localStorage libretune.metro.start)
  legacyModals.ts     Back closes LibreTune's own dialogs
  tilt.ts             press "tilt" effect for .wp-tilt elements
  metro.css           the design system
  metro-skin.css      restyle of the existing editors and dialogs
```

App.tsx is unchanged apart from rendering `MetroShell` instead of `TunerLayout`
and passing it state and actions. Other edits outside `src/metro`:

- `index.html`: device-width viewport divided by display density; theme applied before first paint
- `contexts/ToastContext.*`, `contexts/LoadingContext.*`: WP toast and progress
- `utils/uiScale.ts`: always "phone" (compact editors)
- `menus/buildMenuItems.ts`: drops sidebar/theme/UI-scale/exit (the shell replaces them)
- `components/tuner-ui/TableEditor.tsx`: Fit no longer re-fits on resizes it caused itself.
  Without this, a phone-width page could freeze in a resize feedback loop.
  Fit now measures layout size, not the rect of a page that may be mid-turn.
- `App.refreshPorts`: an empty backend answer becomes `[]`. The connection dialog reads
  the list even while closed, and `undefined` crashed the app.
- Open Sans (OFL, `@fontsource/open-sans`) stands in for Segoe WP; it is by the same designer
- Android: `applicationId com.libretune.wp`, app name, pinch-zoom off, new launcher icons

Tests: the App integration and a11y tests now drive the connection page instead
of the removed toolbar; 399/399 pass (`npx vitest run`).

## Phone layout fixes (Nov 2026)

- **Dialog rows never shrink**: the dialog container scrolls; its top-level rows
  are `flex-shrink: 0` (they were squeezed to 24px and wrapped labels spilled
  over the next row — Vehicle Information).
- **Curves stack in portrait**: `.curve-editor` is the width container; below
  600px the table goes under the graph at full width (embedded and standalone).
  The graph measures its real width in both modes; x-axis labels are capped to
  what fits. The portrait rules sit last in `CurveEditor.css` on purpose.
- **Phone dialog widths** (`DialogRenderer.css`, `max-width: 600px`): command
  buttons two per row with full labels, bench-test count/on/off one per row,
  long INI-name labels break, power-cycle badge wraps under the label.
- **Embedded tables** get `min(72vh, 640px)` on a phone and the dialog scrolls;
  the main VE table no longer uses "fit" on a phone (it clipped every number).
- **Table/curve context menu**: a compact two-column sheet (≤46vh) on the half
  of the screen away from the pressed cell (`data-half`), no keyboard shortcuts,
  no autofocus on touch screens.
- **Number keypad**: table cell edit inputs use `inputMode="decimal"`.
- **Back keeps your place**: `metro/scrollMemory.ts` records each page's
  scroll positions per back-stack entry and restores them when it remounts.
- **Open pages, most recent first**: `metro/recentPages.ts`.
- **CYD status page**: third page lists the INI `[FrontPage]` indicators
  (`get_frontpage`), lit in their INI colour, alarms first (`CydStatus.tsx`).
