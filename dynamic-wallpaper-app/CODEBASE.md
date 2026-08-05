# Codebase Overview — Dynamic Wallpaper App

## What this app does

A lightweight Android app that sets one of the 99 Names of Allah (Asma ul Husna) as the device wallpaper — white Arabic text on a dark background — and rotates through them automatically on a user-defined interval.

---

## App Structure

```
src/
  app/
    _layout.jsx              Root navigation (Stack, orange header)
    index.jsx                Home: list of 99 names
    about.tsx                Empty stub
    asmaUlHusna/
      [ism-number].jsx       Detail page: Skia preview + set wallpaper
    settings/
      index.jsx              Rotation settings
    category/                Empty (unused)
  components/
    IsmCard.jsx              List card (name, transliteration, meaning)
  data/
    asmaUlHusna.js           Static array of all 99 names (no API needed)
  services/
    preferences.js           All user prefs via SecureStore
    schedular/
      backgroundTask.js      Background task definition + execution logic
      schedular.js           Task registration with system
    wallpaper/
      index.js               Re-exports: generateWallpaperImage, setDeviceWallpaper
      manager.js             Bridge to native wallpaper-setting module
      generator.js           Skia canvas renderer (1080×1920 PNG)
  utils/
    getTextColor.js          Black/white text contrast from hex background
modules/
  wallpaper-manager/         Local Expo native module
    android/
      WallpaperManagerModule.kt    Android WallpaperManager API call
    ios/
      WallpaperManagerModule.swift Empty stub — iOS not supported
```

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
| `@shopify/react-native-skia` | Draws directly on a 1080×1920 canvas. Produces gradient background, centered Arabic text, transliteration, translation, meaning. Saves PNG to cache. |

Flow: `generator.js` builds Skia surface → saves PNG to cache → returns URI → `<Image>` shows preview → `manager.js` calls native module to set device wallpaper.

### Native Wallpaper Setting
| Resource | Purpose |
|---|---|
| `modules/wallpaper-manager` | Local Expo module wrapping Android's `WallpaperManager` API. Decodes a bitmap from a file URI and calls `wallpaperManager.setBitmap()`. Supports `home`, `lock`, or `both` targets. |

### Background Rotation
| Package | Purpose |
|---|---|
| `expo-task-manager` | Registers named background tasks that the OS can call |
| `expo-background-task` | Schedules the task to run periodically (Android OS minimum: ~15 min) |

Flow: On app start, `schedular.js` registers task → OS fires `backgroundTask.js` → task checks `shouldRotate()` → generates next wallpaper via Skia → sets via native module.

Fine-grained timing (e.g., sub-15-minute intervals) is handled client-side: `shouldRotate()` compares `wallpaper_last_rotation` timestamp against the configured interval and skips if not enough time has passed.

### Data Persistence
| Package | Purpose |
|---|---|
| `expo-secure-store` | Encrypted key-value store. Holds all user preferences and name cache. |
| `expo-file-system` | File I/O in cache directory. Wallpaper PNGs stored here. |

**Preference keys in `preferences.js`:**
- `wallpaper_auto_rotate` — boolean
- `wallpaper_selected_name_index` — integer (0–98)
- `wallpaper_rotation_interval_minutes` — float (default 1440 = 24h)
- `wallpaper_last_rotation` — timestamp (ms)

### Data
All 99 names are stored as a static JS array in `src/data/asmaUlHusna.js`. No API call, no network dependency, no caching needed. Each entry has `number`, `name` (Arabic), `transliteration`, `translation`, `meaning`.

### UI Utilities
| Package | Purpose |
|---|---|
| `@expo/vector-icons` | Settings gear icon in the header |
| `react-native-gesture-handler` | Required peer dep for expo-router |
| `react-native-reanimated` | Required peer dep for expo-router / Skia worklets |
| `react-native-worklets` | Required by react-native-reanimated and Skia |
| `expo-font` | Font loading — needed for bundling custom Arabic fonts |
| `expo-notifications` | Kept for future notification support |

---

## Data Flow (Full Picture)

```
App Start
  └─ index.jsx
       ├─ load names from static ASMA_UL_HUSNA array (instant, no network)
       ├─ display FlatList of IsmCard
       └─ register background task (schedular.js)

User taps a name card
  └─ [ism-number].jsx
       ├─ on mount: generator.js draws 1080×1920 Skia canvas → saves PNG → <Image> shows preview
       └─ "Set as Wallpaper" button
            └─ manager.js → Android WallpaperManager → updates selected index in SecureStore

Background Task (OS-fired)
  └─ backgroundTask.js
       ├─ shouldRotate()? (timestamp check in preferences.js)
       ├─ load cached names from SecureStore
       ├─ advance index (circular 0–98)
       ├─ generator.js (Skia) → saves PNG
       ├─ manager.js → Android WallpaperManager
       └─ update index + last-rotation timestamp in SecureStore

Settings Screen
  └─ toggle auto-rotate, set interval minutes
       └─ all saved to SecureStore via preferences.js
```

---

## Current State

| Feature | Status |
|---|---|
| List 99 names from API | Works |
| Set wallpaper via Skia + native module | Works |
| Skia preview on detail page | Works |
| Background rotation | Wired up — OS minimum ~15 min |
| Settings (toggle + interval) | Works |
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
