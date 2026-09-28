# LibreTune WP — Windows Phone 8.1 edition (unofficial)

> **Unofficial.** A community edition of [LibreTune](https://github.com/RallyPat/LibreTune) by
> RallyPat and the LibreTune contributors, not affiliated with or endorsed by the LibreTune project.
> Upstream's own README is kept as [README.upstream.md](README.upstream.md).

This is the Android port of LibreTune, open-source ECU tuning software, with its whole interface
rebuilt in the **Windows Phone 8.1 "Metro"** design language: live tiles, pivots, app bars and
turnstile page transitions. It runs on an Android phone and talks to the ECU over a USB OTG cable,
with no root and no PC.

The plain Android edition is
**[libretune-android-unofficial](https://github.com/RudolfsUiska/libretune-android-unofficial)**. The
two install side by side: this one is `com.libretune.wp`, called "LibreTune WP".

## Download

Get the APK from **[Releases](https://github.com/RudolfsUiska/libretune-wp81-unofficial/releases)**.
It needs Android 7.0+ on an **arm64** phone, and it's sideloaded, so allow installing when Android
asks. Plug the ECU in with an OTG cable and Android offers to open the app.

## What's in it

- **Start**: live tiles.
  - The ECU tile flips to live RPM, coolant and AFR. The burn tile turns red with unburned changes,
    and the log tile shows a recording timer.
  - Long-press to unpin, resize or drag tiles. Pin any table or dialog to Start.
- **Start backgrounds**: as on WP 8.1, a picture shows through the tiles and drifts as you scroll.
  There are built-in backgrounds, or use your own photo.
- **tune**: the ECU's menus (fuel, ignition...) as a swipeable pivot.
- **all commands**: every command in an alphabetical app list with a letter jump grid and search.
  Swipe left on Start to get there.
- **Open pages**: an 8.1-style task switcher for everything you have open.
- **start+theme**: LibreTune's nine themes (dark, light, midnight, carbon, synthwave, solarized,
  nord, dracula, high contrast), each with its own accent. Or pick any of the 20 WP accent colours.
- **Existing editors**: LibreTune's own tables, curves, INI dialogs, AutoTune and logging, restyled
  to Metro, with dialogs shown as WP message boxes. Android Back closes dialogs first.
- **Connection page**: port list, baud rate, link metrics, and connect/disconnect.
- **USB serial driver in the app**, shared with the Android edition:
  - CDC-ACM is tested on a rusEFI uaEFI.
  - FTDI, CP210x and CH34x are implemented but not yet tried on real hardware.

How it's built, and the traps met on the way, are in [WINDOWS_PHONE_UI.md](WINDOWS_PHONE_UI.md). The
Android port itself is described in [ANDROID_USB_HANDOFF.md](ANDROID_USB_HANDOFF.md).

## Dashboards

Besides LibreTune's own dashboards and any TunerStudio `.dash` you import, these are built in. Pick
one from the dashboard's **Change ▼** menu, under *Built-in*:

| Dashboard | Look |
|---|---|
| **Windows 8.1** | The Windows 8.1 Start screen, laid out as a dashboard: an "Engine" title and clock, an alert-counting status tile, and live tiles for RPM (with a history graph), boost, AFR↔λ, coolant, battery, speed, IAT and TPS. Tiles turn red past their limits. |
| **Cassette Futurism** | Amber phosphor on scorched brown: stepped RPM meter, LCD readouts, warning LEDs (after NovusGFX's retro design system, MIT) |
| **Montego LCD** | The 1984 MG Montego's LCD cluster: diagonal ramp tacho, seven-segment readouts, bar gauges |
| **CS 1.6** | A Counter-Strike 1.6 style game window (after ekmas/cs16.css, MIT) |

Classic TunerStudio-style dashboards fill the phone screen, as TunerStudio fills its window.
Gauge text is kept inside the gauge when a dashboard is stretched. Warning limits are in
`crates/libretune-app/src/components/dashboards/engineReadings.ts`. The CS 1.6 dashboard was
designed with a pixel font that is not included (its licence is undocumented), so it uses Verdana.

## Build it yourself

On Windows with Git Bash, with Rust (`rustup target add aarch64-linux-android`), Node.js, a JDK 17,
and the Android SDK with NDK 27:

```bash
cd crates/libretune-app && npm ci && cd ../..
export JAVA_HOME=/path/to/jdk-17 ANDROID_HOME=/path/to/Android/Sdk
bash scripts/build-android.sh            # debug APK
bash scripts/build-android.sh --release  # release APK (set KEYSTORE/KEYSTORE_PASS to sign)
```

## Status and safety

Tested on a Samsung Galaxy A34 (Android 14) with a rusEFI uaEFI. Writing a tune to an ECU can
stop an engine from running or damage it. This is early, unofficial software with no warranty. Keep
restore points and know how to recover your ECU.

## License

GPL-2.0-only, the same as upstream ([LICENSE](LICENSE)). Third-party notices are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The Metro look is an homage to Microsoft's design
language; no Microsoft assets are used, and Open Sans (SIL OFL) stands in for Segoe. All credit for
LibreTune itself goes to its authors.
