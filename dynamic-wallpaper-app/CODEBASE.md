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
      [ism-number].jsx       Detail page: Skia preview + "Set as Wallpaper" button
    settings/
      index.jsx              Rotation settings (toggle, interval, reset) + "Rotate Now" test button
    category/                Empty (unused)
  components/
    IsmCard.jsx              List card (Arabic name, transliteration, translation, meaning)
  data/
    asmaUlHusna.js           Static array ASMA_UL_HUSNA — all 99 names (no API needed)
  services/
    preferences.js           All user prefs via expo-secure-store
    schedular/
      backgroundTask.js      TaskManager.defineTask(WALLPAPER_TASK) — the rotation executor
      schedular.js           registerWallpaperScheduler() — registers/unregisters with the OS
    wallpaper/
      index.js               Re-exports: generateWallpaperImage, setDeviceWallpaper
      generator.js           generateWallpaperImage(ism) — Skia renderer (1080×1920 PNG)
      manager.js             setDeviceWallpaper(uri) — bridge to the native module
      rotation.js            rotateWallpaper({force}) — shared rotation routine with in-flight guard
  utils/
    getTextColor.js          Black/white text contrast from hex background
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

- `src/services/wallpaper/generator.js` → `generateWallpaperImage(ism)`
  - Draws on a 1080×1920 Skia surface: dark gradient background, Arabic name via the Paragraph API (HarfBuzz shaping, bundled `assets/fonts/NotoNaskhArabic-Regular.ttf` — see `getArabicFontProvider()`), then transliteration, translation, wrapped meaning, and `#number` footer.
  - Encodes to PNG and writes it to the cache directory (`wallpaper_<number>.png`), returns the file URI.
  - This is the **single source of truth** for wallpaper images — both the detail screen and the background task use it.

### 4. Automatic rotation

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

### 5. Settings

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
- Compound helpers: `resetRotationIndex()` (index→0, timestamp→now), `shouldRotate()` (auto-rotate on AND interval elapsed)

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
       └─ "Set as Wallpaper"
            ├─ setDeviceWallpaper(uri) → native WallpaperManagerModule (home + lock)
            ├─ setSelectedNameIndex(index)     (rotation continues from this name)
            └─ setLastRotation(now)            (restart the rotation clock)

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
| Background rotation | Works — FG timer while app is open + OS task while closed; exact timing via `shouldRotate()` gate |
| Settings (toggle + interval) | Works — re-registers scheduler with `force: true` |
| iOS support | No — native module is an empty stub |
| Font customization | Not built |
| Text positioning | Not built |
| Theme / color mode | Not built |
| User auth | Not built |
| Remote DB for preferences | Not built |

---

## Confirmed Technical Decisions

**Rendering path: Skia only.**
`generator.js` is the single source of truth for wallpaper image generation. The ViewShot path has been removed. Reason: Skia takes explicit coordinates, font size, and color as parameters — maps directly to form inputs for the customization feature.

**Rotation: dual path, one shared routine.**
expo-background-task never runs while the app is in the foreground (native `inForeground` check) and its WorkManager job requires network connectivity. So rotation is driven by two callers of the single `rotateWallpaper()` routine in `rotation.js`: a `setTimeout` chain in `_layout.jsx` for the foreground case, and the OS task in `backgroundTask.js` for the backgrounded/killed case. Both are gated by `shouldRotate()`, and an in-flight guard prevents double-rotation if both fire at once. Registration is guarded so app opens don't reset the WorkManager timer; only settings changes force a re-registration.

---

## Roadmap

### 1. Form-Based Wallpaper Customization (next)

A settings-style form screen — no visual drag editor. User enters values, taps "Apply", sees a Skia preview, then optionally sets as wallpaper.

**Controls:**
- Font family — select from a predefined list (custom fonts must be bundled in `assets/fonts/` and loaded via `expo-font`)
- Font size — number input
- Text color — hex input or preset swatches
- Horizontal position — slider mapping to X offset on Skia canvas
- Vertical position — slider mapping to Y coordinate on Skia canvas

**Where settings live:**
- New keys in `preferences.js`: `wallpaper_font_family`, `wallpaper_font_size`, `wallpaper_text_color`, `wallpaper_text_x`, `wallpaper_text_y`
- `generator.js` accepts these as parameters (or reads from prefs)
- Background task picks up these prefs so rotation respects the user's style

### 2. User Authentication

Simple email/phone or social sign-in. Provider not yet decided.

### 3. Remote Database for Preferences

Store per-user preferences (customization + rotation settings) in a remote DB. Will replace or sync with the current SecureStore-only approach. Keep the data model as a flat key-value or simple JSON object per user to make migration straightforward.

---

## Known Issues

1. `about.tsx` is empty
2. `category/` route is empty
3. iOS native module (`WallpaperManagerModule.swift`) is an empty stub
4. The OS background task never runs while the app is in the foreground (by design — the foreground timer in `_layout.jsx` covers that case) and requires network connectivity (expo's WorkManager constraint), so background rotations pause while the device is offline.
5. Background timing is inexact — Android treats `minimumInterval` as a minimum delay and may defer execution depending on doze/OEM battery savers.
