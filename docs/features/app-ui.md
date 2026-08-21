# App UI (navigation + screens)

## Purpose

The Expo Router navigation structure + the Home/Names/Detail/Customize screens.
This is the user-facing app shell. It consumes services; it does not own
business logic.

## Relevant files

- `index.js` — JS entry (imports `backgroundTask.js` before `expo-router/entry` — see `scheduling.md`).
- `src/app/_layout.jsx` — root Stack + splash + custom fonts.
- `src/app/(tabs)/_layout.jsx` — bottom tabs (Home · Names · Settings).
- `src/app/(tabs)/index.jsx` — Home (wallpaper hero + Set + Next + rotation status + onboarding gate).
- `src/app/(tabs)/names.jsx` — searchable list of 99 names.
- `src/app/name/[id].jsx` — single name detail (preview + Set + Customize link).
- `src/app/customize.jsx` — simple appearance settings (presets + font/size/color/position).

## Navigation structure

```
Stack (root _layout)
├── (tabs)                    bottom tabs
│   ├── index                 Home
│   ├── names                 Names list
│   └── settings              Settings hub
├── onboarding                first-launch (modal-style fade)
├── name/[id]                name detail
├── customize                appearance settings (modal presentation)
├── profile                  edit profile
├── notifications            notification settings
├── about                    about + privacy + version
└── logs                     hidden activity log
```

## Main screens

- **Home** (`(tabs)/index.jsx`):
  - Wallpaper preview is the visual hero.
  - Reads `selectedNameIndex` (preferences) → shows the current name.
  - `Set Wallpaper` → `applyWallpaper({ source: "manual" })`.
  - `Next Name` → advances the local view (does not set; tap Set to apply).
  - Rotation-status row ("Auto · in 2 h" / "Manual").
  - Hosts the onboarding gate: on mount, if `!getOnboardingCompleted()` → `router.replace("/onboarding")` while the splash is still up (no flicker).
- **Names** (`(tabs)/names.jsx`): search by transliteration/translation/Arabic/number.
- **Detail** (`name/[id].jsx`): large Arabic + meaning + preview + Set + Customize link.
- **Customize** (`customize.jsx`): simple settings — presets, Arabic font, size, color, align. Uses `WallpaperPreview` for live preview; writes `wallpaper_settings`.

## Data flow

Screens read from preferences and call services; they do not own state beyond
local UI. Example (Home Set):

```
user taps Set Wallpaper
  → generateWallpaperImage(name) (wallpaper)
  → applyWallpaper({ uri, name, index, source: "manual" }) (rotation)
      → setDeviceWallpaper (wallpaper → native)
      → setSelectedNameIndex + setLastRotation (preferences)
      → notifyWallpaperChanged (notifications)
```

## Important constraints

- **The onboarding gate lives in Home, not in `_layout.jsx`.** Doing it in Home (the initial route) lets the splash stay up during the redirect → no flicker. Do not move it.
- **Customize is a modal** (`presentation: "modal"`). Do not change to a full push.
- **The `WallpaperPreview` component expects `{ ism, settings, width }`** (not `name`). Height is derived from width. Don't rename.
- **No foreground rotation anywhere in the UI.** Home shows status only; it does not auto-rotate. See `docs/decisions/001-background-only-rotation.md`.

## External dependencies

- `expo-router` (Stack, Tabs, `useRouter`, `useLocalSearchParams`, `useFocusEffect`).
- `react-native-safe-area-context` (`SafeAreaView`).
- `expo-splash-screen` (held during the onboarding gate).
- `@shopify/react-native-skia` (via `WallpaperPreview`).

## Related features

- **all services** — screens call them.
- **design-system** — theme + UI components.
- **onboarding-profile** — Home hosts the gate.
- **settings-ui** — the Settings tab + sub-screens (documented separately).

## Known bugs / issues

- None known.
