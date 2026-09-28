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
