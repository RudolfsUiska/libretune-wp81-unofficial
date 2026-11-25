#!/usr/bin/env bash
# Build (and optionally install) the LibreTune WP (Windows Phone UI) Android APK on Windows.
#
#   scripts/build-android.sh [--release] [--install]
#
# `tauri android build` compiles the Rust library, then tries to *symlink* it
# into jniLibs, which Windows refuses unless Developer Mode is on. This script
# lets that step fail, copies the library in (stripped - a debug build is
# ~600 MB of DWARF), and runs Gradle with the Rust task skipped.
#
# Toolchain locations default to this machine's; override via the environment.
set -euo pipefail

PROFILE=debug
INSTALL=0
for a in "$@"; do
  case "$a" in
    --release) PROFILE=release ;;
    --install) INSTALL=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/crates/libretune-app"
ANDROID_DIR="$APP/src-tauri/gen/android"

export JAVA_HOME="${JAVA_HOME_17:-C:\\Users\\Rudolfs\\Android\\jdk-17.0.20.1+1}"
export ANDROID_HOME="${ANDROID_HOME:-C:\\Users\\Rudolfs\\Android\\Sdk}"
export NDK_HOME="${NDK_HOME:-$ANDROID_HOME\\ndk\\27.2.12479018}"
export PATH="$HOME/.cargo/bin:$(cygpath -u "$JAVA_HOME")/bin:$PATH"
ADB="${ADB:-/c/Users/Rudolfs/Documents/android7/platform-tools/adb.exe}"
STRIP="$(cygpath -u "$NDK_HOME")/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-strip.exe"

# tauri-cli >= 2.12 takes --apk as a bare flag (it used to want a value).
flags=(--apk --target aarch64)
[ "$PROFILE" = debug ] && flags+=(--debug)

cd "$APP"
# Expected to fail at the symlink step on Windows; the library is built by then.
STAMP="$(mktemp)"
npx tauri android build "${flags[@]}" || true

SO="$ROOT/target/aarch64-linux-android/$PROFILE/liblibretune_app_lib.so"
DEST="$ANDROID_DIR/app/src/main/jniLibs/arm64-v8a"
[ -f "$SO" ] || { echo "Rust library not built: $SO" >&2; exit 1; }
# The build above is allowed to fail, so make sure it got as far as the library:
# otherwise a stale one is packaged and the APK silently carries old code.
[ "$SO" -nt "$STAMP" ] || { echo "Rust library was not rebuilt (stale $SO); see the tauri error above" >&2; exit 1; }
rm -f "$STAMP"
mkdir -p "$DEST"
rm -f "$DEST/liblibretune_app_lib.so"
"$STRIP" --strip-debug -o "$DEST/liblibretune_app_lib.so" "$SO"

Cap=$([ "$PROFILE" = debug ] && echo Debug || echo Release)
cd "$ANDROID_DIR"
# Gradle rewrites the APK in place and leaves the replaced 140 MB library as
# dead space inside the zip, doubling the file; always package from scratch.
rm -f "$ANDROID_DIR"/app/build/outputs/apk/arm64/"$PROFILE"/*.apk
./gradlew.bat "assembleArm64$Cap" -x "rustBuildArm64$Cap" --console=plain -q

APK="$(ls -t "$ANDROID_DIR"/app/build/outputs/apk/arm64/"$PROFILE"/*.apk | head -1)"
echo "APK: $APK ($(du -h "$APK" | cut -f1))"

if [ "$INSTALL" = 1 ]; then
  "$ADB" install -r "$APK"
  "$ADB" shell am start -n com.libretune.wp/com.libretune.app.MainActivity
fi
