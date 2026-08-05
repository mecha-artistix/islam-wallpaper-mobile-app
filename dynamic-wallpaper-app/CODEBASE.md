# Codebase Overview — Dynamic Wallpaper App

## What this app does

A lightweight Android app that sets one of the 99 Names of Allah (Asma ul Husna) as the device wallpaper — white Arabic text on a dark background — and rotates through them automatically on a user-defined interval.

---

## App Structure

```
src/
  app/
    _layout.jsx              Root navigation (Stack, orange header). Imports backgroundTask at
                             root (so TaskManager.defineTask runs in headless contexts) and
                             runs the foreground rotation timer.
    index.jsx                Home: FlatList of 99 names. Registers the background scheduler on mount.
    about.tsx                Empty stub
    asmaUlHusna/
      [ism-number].jsx       Detail page: Skia preview + "Set as Wallpaper" + "Customize" → /editor
    settings/
      index.jsx              Rotation settings (toggle, interval, reset) + "Rotate Now" test button
    editor.jsx               Wallpaper editor: live preview + draggable settings sheet (custom header)
    category/                Empty (unused)
  components/
    IsmCard.jsx              List card (number badge, transliteration + translation, Arabic name)
    editor/
      WallpaperPreview.jsx   Live preview — maps wallpaperSettings to Skia/RN components (no PNG)
      controls.jsx           Generic editor controls: SliderRow, ColorRow, SegmentedRow, SwitchRow
  data/
    asmaUlHusna.js           Static array ASMA_UL_HUSNA — all 99 names (no API needed)
  theme.js                   useTheme() — dark/light palette following the system theme (useColorScheme)
  services/
    preferences.js           All user prefs via expo-secure-store (+ presets via a JSON file)
    schedular/
      backgroundTask.js      TaskManager.defineTask(WALLPAPER_TASK) — the rotation executor
      schedular.js           registerWallpaperScheduler() — registers/unregisters with the OS
    wallpaper/
      index.js               Re-exports: generateWallpaperImage, setDeviceWallpaper
      generator.js           generateWallpaperImage(ism, settings?) — Skia renderer (1080×1920 PNG)
      manager.js             setDeviceWallpaper(uri) — bridge to the native module
      rotation.js            rotateWallpaper({force}) — shared rotation routine with in-flight guard
      settings.js            wallpaperSettings model: defaults, built-in presets, mergeSettings()
      renderSpec.js          buildRenderSpec(settings) — normalizes settings for both renderers
      fonts.js               FONT_FILES registry (single file or weight map) + resolveFontFile nearest-weight fallback
modules/
  wallpaper-manager/         Local Expo native module
    android/
      WallpaperManagerModule.kt    setWallpaper(uri, target) via Android WallpaperManager API
    ios/
      WallpaperManagerModule.swift Empty stub — iOS not supported
```

---

## How Each Feature Works

### 1. Browsing names (Home)

- `src/app/index.jsx` → `Index()`
  - Renders a `FlatList` over the static `ASMA_UL_HUSNA` array from `src/data/asmaUlHusna.js` (no network).
  - Each row is `src/components/IsmCard.jsx` → `IsmCard({ name })`.
  - On mount it calls `registerWallpaperScheduler()` (see Feature 4).
  - Tapping a card pushes `/asmaUlHusna/[ism-number]` with the name object as a JSON param.

### 2. Previewing and setting a wallpaper manually

- `src/app/asmaUlHusna/[ism-number].jsx` → `IsmPage()`
  - On mount, `generatePreview()` calls `generateWallpaperImage(ismullah)` and shows the returned PNG URI in an `<Image>`.
  - "Set as Wallpaper" → `handleSetWallpaper()`:
    1. `setDeviceWallpaper(previewUri)` → `src/services/wallpaper/manager.js` → native `setWallpaper(uri, "both")` in `modules/wallpaper-manager/android/WallpaperManagerModule.kt` (sets home + lock screen).
    2. Saves the chosen position with `setSelectedNameIndex(index)` so auto-rotation continues from this name.
    3. Restarts the rotation clock with `setLastRotation(Date.now())` so the next auto-rotation is a full interval away.

### 3. Wallpaper image generation (Skia)

- `src/services/wallpaper/generator.js` → `generateWallpaperImage(ism, settings?)`
  - Draws on a 1080×1920 Skia surface. **Every visual value — colors, sizes, spacing, alignment, effects — comes from the `wallpaperSettings` object** (see Feature 4); when `settings` is omitted it loads the saved theme via `getWallpaperSettings()` + `mergeSettings()`, so rotation and the detail page always render the user's current theme.
  - Geometry is normalized by `buildRenderSpec(settings)` in `renderSpec.js` (gradient direction vector, ordered visible text blocks with per-block spacing). The generator only measures text and draws.
  - Arabic uses the Paragraph API (HarfBuzz shaping); shadow maps to `TextStyle.shadows`. All custom fonts (Arabic and Latin) are registered from the `FONT_FILES` registry (`fonts.js`, backed by `assets/fonts/*.ttf`/`*.otf`) into a single TypefaceFontProvider — see `getFontProvider()`. A registry value is either one file or a weight map (`{ "300": ..., "400": ..., "700": ... }`); `resolveFontFile(family, weight)` picks the exact weight or the nearest available file. Latin blocks use `makeFont()`: system families via `matchFont` (with weight), registry fonts via `Skia.Font(typeface, size)`. Effects are drawn as passes: outline (stroke under-draw) → glow (MaskFilter blur under-draw) → fill with drop-shadow ImageFilter.
  - Encodes to PNG and writes it to the cache directory (`wallpaper_<number>.png`), returns the file URI.
  - This is the **single source of truth** for wallpaper images — the detail screen, the editor, and the background task all use it.

### 4. Wallpaper customization (the editor)

One object describes the whole appearance: **`wallpaperSettings`**, defined with defaults in `src/services/wallpaper/settings.js` (`DEFAULT_WALLPAPER_SETTINGS`). Sections: `background` (gradient/solid, colors, angle, overlay), `arabic`, `transliteration`, `translation`, `meaning` (font/size/weight/color/opacity per block + visibility), `numberBadge`, `layout` (top offset, per-gap spacing, content width, horizontal align, safe margin), `effects` (shadow/glow/outline).

**Adding a new option requires only:** (1) a property in `DEFAULT_WALLPAPER_SETTINGS`, (2) one control in `editor.jsx`, (3) reading it in `generator.js` / `renderSpec.js`.

- `src/app/editor.jsx` → `WallpaperEditorScreen()` (route `/editor`, opened from the detail page's "Customize" button; the `ism` object is passed as a JSON param)
  - **Edits the settings object only** — a single `useState` + immutable `setPath(settings, "background.gradient.startColor", value)`; no Skia calls, no rendering logic.
  - Layout: live preview on top (~60%), a draggable settings sheet (collapsed / medium / expanded snap points via reanimated + gesture-handler), section chips (Themes, Background, Arabic, …, Effects), bottom bar (Reset / Save Preset / Set Wallpaper).
  - Generic controls in `src/components/editor/controls.jsx`: `SliderRow` (PanResponder slider), `ColorRow` (swatches + hex input), `SegmentedRow`, `SwitchRow`.
- `src/components/editor/WallpaperPreview.jsx` → **live preview**: maps `buildRenderSpec(settings)` to components — Skia `<Canvas>` for the gradient, RN `<Text>` for the text stack (Arabic uses the expo-font-loaded NotoNaskhArabic). Coordinates scale linearly from the 1080×1920 canvas. It **never regenerates the PNG**; regeneration happens only on "Set Wallpaper". Preview approximations: outline is not shown (RN Text has no stroke), glow is approximated with a same-color text shadow.
- **Themes**: `BUILT_IN_PRESETS` in `settings.js` (Dark Night, Gold, Minimal, Classic, Modern) are plain `wallpaperSettings` objects applied via `mergeSettings`. User presets are saved through a name-prompt modal.
- **Persistence** (`preferences.js`): the active theme is stored as JSON in SecureStore key `wallpaper_settings` (`getWallpaperSettings` / `setWallpaperSettings`); `mergeSettings()` deep-merges saved partials over defaults so old saves survive new properties. User presets live in a JSON **file** (`wallpaper_presets.json` in the documents dir — a presets list would exceed SecureStore's ~2KB value limit): `getWallpaperPresets` / `saveWallpaperPreset` / `deleteWallpaperPreset`.
- **Set Wallpaper** from the editor: persists the theme (`setWallpaperSettings`), renders the PNG with those exact settings, sets it, and updates the rotation index + clock — so background rotation continues with the same theme.

### 5. Automatic rotation

Rotation runs through **two paths that share one routine**, because of a hard native limitation: expo-background-task **never executes while the app is in the foreground** (verified in `BackgroundTaskScheduler.kt` — when `inForeground` is true it just reschedules and returns). Its WorkManager job also requires **network connectivity** (`NetworkType.CONNECTED` constraint).

- `src/services/wallpaper/rotation.js` → `rotateWallpaper({ force = false } = {})`
  - The single rotation routine. Gated by `shouldRotate()` unless `force: true`.
  - An in-flight guard prevents the FG timer and the OS task from double-advancing the index if both fire simultaneously.
  - Steps: advance index circularly `(current + 1) % 99` → `generateWallpaperImage(name)` → `setDeviceWallpaper(uri)` → persist `setSelectedNameIndex` + `setLastRotation`.

**Path A — foreground timer** (`src/app/_layout.jsx`, in `RootLayout`'s `useEffect`):
A `setTimeout` chain that wakes at the next interval boundary (capped at 60 s so settings changes take effect within a minute) and calls `rotateWallpaper()`. When auto-rotate is off it wakes every 60 s anyway, so toggling it on in settings takes effect without an app restart. Covers the "app is open" case.

**Path B — OS background task** (covers backgrounded/killed app):
- `src/services/schedular/backgroundTask.js` — `TaskManager.defineTask(WALLPAPER_TASK, ...)` calls `rotateWallpaper()`. Imported at the top of `_layout.jsx` so `defineTask` runs in a headless (app-killed) JS context. On Android 8+ the library chains `OneTimeWorkRequest`s with `initialDelay = interval`, so sub-15-minute intervals work; pre-Android-8 falls back to `PeriodicWorkRequest` (15-min floor).
- `src/services/schedular/schedular.js` — `registerWallpaperScheduler({ force = false } = {})`:
  - If auto-rotate is off → unregisters and returns.
  - `force=false` (app start, from `index.jsx`): skips if already registered (`TaskManager.isTaskRegisteredAsync`). Re-registering resets the WorkManager timer, so without this guard a daily app opener could push a 24h rotation back indefinitely.
  - `force=true` (settings changed): unregisters then re-registers so the new interval takes effect immediately.
  - `minimumInterval` is **minutes** (expo-background-task, SDK 57), passed through from the user's setting, clamped only to ≥1: `Math.max(1, Math.floor(intervalMinutes))`. The OS treats it as a minimum delay, not an exact schedule.

Callers of `registerWallpaperScheduler`:
- `src/app/index.jsx` — on mount, default `force: false`.
- `src/app/settings/index.jsx` — `handleAutoRotateToggle()` and `handleIntervalSubmit()`, both `{ force: true }`.

### 6. Settings

- `src/app/settings/index.jsx` → `SettingsScreen()`
  - Toggle → `setAutoRotate(value)` then `registerWallpaperScheduler({ force: true })`.
  - Interval input → validates a positive number, `setRotationIntervalMinutes(minutes)`, then `registerWallpaperScheduler({ force: true })`.
  - "Reset Rotation" → `resetRotationIndex()` (index 0 + fresh timestamp).
  - "Rotate Now" (test) → `rotateWallpaper({ force: true })` — rotates immediately, ignoring the interval. Use this to verify generation + wallpaper setting end to end without waiting for the OS task (which only fires while the app is closed and the device has network).
  - Status section reads live values via `getSelectedNameIndex()`, `getAutoRotate()`, `getRotationIntervalMinutes()`, `getLastRotation()`.

---

## Packages and What They Do

### Core Framework
| Package | Version | Purpose |
|---|---|---|
| `expo` | ~57.0.1 | Expo SDK — managed workflow |
| `react` | 19.2.3 | UI library |
| `react-native` | 0.86.0 | Mobile runtime |

### Navigation
| Package | Purpose |
|---|---|
| `expo-router` | File-based routing. `src/app/` maps 1:1 to screens. Stack navigator with orange header. |

### Wallpaper Rendering — Skia Only
| Package | Purpose |
|---|---|
| `@shopify/react-native-skia` | Draws directly on a 1080×1920 canvas in `generator.js`. Gradient background, shaped Arabic text (Paragraph API), Latin text via `matchFont`. Saves PNG to cache. |

### Native Wallpaper Setting
| Resource | Purpose |
|---|---|
| `modules/wallpaper-manager` | Local Expo module wrapping Android's `WallpaperManager` API. Decodes a bitmap from a file URI and calls `wallpaperManager.setBitmap()`. Supports `home`, `lock`, or `both` targets (the app always uses `both`). |

### Background Rotation
| Package | Purpose |
|---|---|
| `expo-task-manager` | `TaskManager.defineTask` (task body in `backgroundTask.js`) and `TaskManager.isTaskRegisteredAsync` (registration guard in `schedular.js`) |
| `expo-background-task` | `registerTaskAsync` / `unregisterTaskAsync` in `schedular.js`. `minimumInterval` is in minutes; OS treats it as a minimum delay. Native constraints: never runs while the app is in the foreground; WorkManager job requires network connectivity. |

Fine-grained timing is handled client-side: `shouldRotate()` in `preferences.js` compares `wallpaper_last_rotation` against the configured interval and skips if not enough time has passed. The OS wake-up is only an opportunity to rotate, not the schedule itself. Rotation while the app is open is handled by the foreground timer in `_layout.jsx`.

### Data Persistence
| Package | Purpose |
|---|---|
| `expo-secure-store` | Encrypted key-value store. Holds all user preferences. |
| `expo-file-system` | File I/O in cache directory. Wallpaper PNGs stored here. |

**Preference keys in `src/services/preferences.js`** (accessors in parentheses):
- `wallpaper_auto_rotate` — boolean, default `true` (`getAutoRotate` / `setAutoRotate`)
- `wallpaper_selected_name_index` — integer 0–98, default `0` (`getSelectedNameIndex` / `setSelectedNameIndex`)
- `wallpaper_rotation_interval_minutes` — float, default `1440` = 24h (`getRotationIntervalMinutes` / `setRotationIntervalMinutes`)
- `wallpaper_last_rotation` — timestamp ms, default `null` (`getLastRotation` / `setLastRotation`)
- `wallpaper_settings` — JSON string, the active theme (`getWallpaperSettings` / `setWallpaperSettings`)
- Compound helpers: `resetRotationIndex()` (index→0, timestamp→now), `shouldRotate()` (auto-rotate on AND interval elapsed)

**Files (not SecureStore):**
- `wallpaper_presets.json` in the documents directory — user-saved theme presets (`getWallpaperPresets` / `saveWallpaperPreset` / `deleteWallpaperPreset`). A file because a presets list exceeds SecureStore's ~2KB value limit.
- `wallpaper_<number>.png` in the cache directory — last generated wallpaper image.

### Data
All 99 names are stored as a static JS array in `src/data/asmaUlHusna.js`. No API call, no network dependency, no caching needed. Each entry has `number`, `name` (Arabic), `transliteration`, `translation`, `meaning`.

### UI Utilities
| Package | Purpose |
|---|---|
| `@expo/vector-icons` | Settings gear icon in the home header |
| `react-native-gesture-handler` | Required peer dep for expo-router |
| `react-native-reanimated` | Required peer dep for expo-router / Skia worklets |
| `react-native-worklets` | Required by react-native-reanimated and Skia |
| `expo-font` | Font loading — needed for bundling custom Arabic fonts |
| `expo-notifications` | Installed, currently unused — kept for future notification support |

---

## Data Flow (Full Picture)

```
App Start
  └─ _layout.jsx
       ├─ imports backgroundTask.js → TaskManager.defineTask(WALLPAPER_TASK) registered
       └─ starts foreground rotation timer (setTimeout chain → rotateWallpaper())
  └─ index.jsx
       ├─ render FlatList of ASMA_UL_HUSNA via IsmCard
       └─ registerWallpaperScheduler()          (force=false — skips if already registered)

User taps a name card
  └─ [ism-number].jsx
       ├─ on mount: generateWallpaperImage(ism) → PNG in cache → <Image> preview
       ├─ "Set as Wallpaper"
       │    ├─ setDeviceWallpaper(uri) → native WallpaperManagerModule (home + lock)
       │    ├─ setSelectedNameIndex(index)     (rotation continues from this name)
       │    └─ setLastRotation(now)            (restart the rotation clock)
       └─ "Customize" → /editor (ism passed as JSON param)

Wallpaper Editor (/editor)
  └─ editor.jsx — edits ONE wallpaperSettings object (useState + setPath)
       ├─ WallpaperPreview re-renders live from settings (no PNG regeneration)
       ├─ Themes section applies BUILT_IN_PRESETS / user presets via mergeSettings
       ├─ "Save Preset" → saveWallpaperPreset (JSON file in documents dir)
       ├─ "Reset" → DEFAULT_WALLPAPER_SETTINGS
       └─ "Set Wallpaper"
            ├─ setWallpaperSettings(settings)   (theme persisted for rotation)
            ├─ generateWallpaperImage(ism, settings) → setDeviceWallpaper(uri)
            └─ setSelectedNameIndex + setLastRotation

Rotation — shared routine (services/wallpaper/rotation.js → rotateWallpaper)
  ├─ shouldRotate()?                           (auto-rotate on + interval elapsed; skipped when force=true)
  ├─ nextIndex = (current + 1) % 99
  ├─ generateWallpaperImage(name) → setDeviceWallpaper(uri)
  └─ setSelectedNameIndex + setLastRotation

  Called by:
  ├─ Foreground timer (_layout.jsx)            — while the app is open
  ├─ OS background task (backgroundTask.js)    — while the app is closed; requires network
  └─ "Rotate Now" button (settings)            — force=true, immediate

Settings Screen
  └─ toggle / interval change
       ├─ write pref via preferences.js
       └─ registerWallpaperScheduler({ force: true })   (re-register with new config)
```

---

## Current State

| Feature | Status |
|---|---|
| List 99 names (static data) | Works |
| Set wallpaper via Skia + native module | Works |
| Skia preview on detail page | Works |
| Wallpaper customization (editor, themes, presets) | Works — settings drive generator + rotation |
| Background rotation | Works — FG timer while app is open + OS task while closed; exact timing via `shouldRotate()` gate |
| Settings (toggle + interval) | Works — re-registers scheduler with `force: true` |
| iOS support | No — native module is an empty stub |
| Background images / AI backgrounds | Not built (settings model has room: `background.mode`) |
| Lock/home screen layouts, templates | Not built |
| Theme / color mode (app UI) | Not built |
| User auth | Not built |
| Remote DB for preferences | Not built |

---

## Confirmed Technical Decisions

**Rendering path: Skia only, driven by one settings object.**
`generator.js` is the single source of truth for wallpaper image generation, and every visual value comes from `wallpaperSettings` (`settings.js`) via `buildRenderSpec` (`renderSpec.js`). The editor edits the object only; the live preview (`WallpaperPreview.jsx`) maps the same render spec to RN/Skia components and never regenerates the PNG. This split is what lets a new control ship by touching only: the defaults object, the editor UI, and the renderer.

**Rotation: dual path, one shared routine.**
expo-background-task never runs while the app is in the foreground (native `inForeground` check) and its WorkManager job requires network connectivity. So rotation is driven by two callers of the single `rotateWallpaper()` routine in `rotation.js`: a `setTimeout` chain in `_layout.jsx` for the foreground case, and the OS task in `backgroundTask.js` for the backgrounded/killed case. Both are gated by `shouldRotate()`, and an in-flight guard prevents double-rotation if both fire at once. Registration is guarded so app opens don't reset the WorkManager timer; only settings changes force a re-registration.

---

## Roadmap

The customization editor (previously roadmap #1) is **built** — see Feature 4. Remaining plans, all designed to fit the settings-object architecture without refactoring:

### 1. More background modes and templates

`background.mode` already accepts new values: `"image"` (pick a photo as the backdrop) and `"ai"` (generated backgrounds). Also planned: lock/home screen layouts, decorative frames, Quran verse and Hadith templates, stickers, watermark, seasonal/automatic daily themes — each is a new settings section or preset bundle.

### 2. Preset import/export

User presets are already self-contained JSON (`wallpaper_presets.json`) — export/share is a serialization step on top of `getWallpaperPresets`. Favorites per-name also fit here.

### 3. User Authentication

Simple email/phone or social sign-in. Provider not yet decided.

### 4. Remote Database for Preferences

Store per-user preferences (theme + presets + rotation settings) in a remote DB. Will replace or sync with the current SecureStore/file approach. The settings model is already a flat JSON object per user to keep migration straightforward.

---

## Known Issues

1. `about.tsx` is empty
2. `category/` route is empty
3. iOS native module (`WallpaperManagerModule.swift`) is an empty stub
4. The OS background task never runs while the app is in the foreground (by design — the foreground timer in `_layout.jsx` covers that case) and requires network connectivity (expo's WorkManager constraint), so background rotations pause while the device is offline.
5. Background timing is inexact — Android treats `minimumInterval` as a minimum delay and may defer execution depending on doze/OEM battery savers.
6. Editor live-preview approximations (final PNG is always exact): outline is not previewed (RN Text has no stroke), glow is approximated with a same-color text shadow, and glow/outline don't apply to the Arabic block (Skia Paragraph supports shadows only).
