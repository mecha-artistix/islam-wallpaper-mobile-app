# CODEBASE.md — Architectural map

This is a MAP, not a manual. For implementation detail, read the relevant
feature doc in `docs/features/`. For global agent rules, read `AGENTS.md`.
Source of truth hierarchy: **source code → feature doc → this map**.

## What the app does

An Android app (Expo / React Native) that displays the 99 Names of Allah (Asma
ul Husna) as device wallpapers. The user can browse names, set one manually, or
enable automatic rotation via an Android background task on a configurable
interval (min 1 minute). Includes onboarding (optional name/email), wallpaper
appearance customization, and local notifications.

## Tech stack

- Expo SDK 57 / React Native 0.86, Expo Router (file-based, bottom tabs)
- `expo-background-task` + `expo-task-manager` (Android WorkManager)
- `expo-secure-store` (preferences), `expo-file-system` (logs + presets)
- `@shopify/react-native-skia` (offscreen wallpaper PNG generation)
- `expo-notifications` (local notifications)
- Local Expo module `modules/wallpaper-manager` (Android `WallpaperManager`)
- Jest + jest-expo (unit tests; no component/integration tests yet)

## Feature map

| Feature | Doc | Source roots |
|---|---|---|
| Wallpaper (generate/apply/appearance) | `docs/features/wallpaper.md` | `src/services/wallpaper/`, `modules/wallpaper-manager/`, `src/components/WallpaperPreviewImage.jsx`, `src/components/editor/WallpaperPreview.jsx` |
| Rotation (which name + whether due) | `docs/features/rotation.md` | `src/services/wallpaper/rotation.js`, rotation accessors in `src/services/preferences.js` |
| Scheduling (OS wake-up) | `docs/features/scheduling.md` | `src/services/schedular/`, `index.js` |
| Preferences (persistence) | `docs/features/preferences.md` | `src/services/preferences.js`, `src/services/logger.js` |
| Notifications | `docs/features/notifications.md` | `src/services/notifications.js` |
| Names (99-names dataset) | `docs/features/names.md` | `src/data/asmaUlHusna.js` |
| Onboarding & Profile | `docs/features/onboarding-profile.md` | `src/app/onboarding.jsx`, `src/app/profile.jsx`, profile accessors in `preferences.js` |
| Settings UI | `docs/features/settings-ui.md` | `src/app/(tabs)/settings.jsx`, `src/app/{notifications,about,logs}.jsx` |
| App UI (navigation + screens) | `docs/features/app-ui.md` | `src/app/_layout.jsx`, `src/app/(tabs)/`, `src/app/name/[id].jsx`, `src/app/customize.jsx` |
| Design system | `docs/features/design-system.md` | `src/theme.js`, `src/components/ui/` |

## Architecture decisions (do not reintroduce)

- `docs/decisions/001-background-only-rotation.md` — no foreground rotation.
- `docs/decisions/002-defineTask-from-js-entry.md` — `defineTask` runs from `index.js`, not a layout.
- `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md` — user value preserved (min 1); OS cadence separate.

## Dependency direction (no cycles)

```
scheduling → rotation → wallpaper → wallpaper-manager (native)
     ↓           ↓          ↓
     └──── preferences (leaf) ────┘
            ↑
app-ui / settings-ui → all services
rotation → notifications (notify on change)
```

## Cross-feature relationships (the important ones)

- **Home screen** (`app-ui`) reads `selectedNameIndex` (preferences) → generates a preview (wallpaper) → on Set, calls `applyWallpaper` (rotation).
- **Settings UI** toggles `autoRotate` (preferences) → calls `registerWallpaperScheduler` (scheduling).
- **Background task** (scheduling) fires → `runWallpaperBackgroundTask` → `rotateWallpaper` (rotation) → `shouldRotate` gate (preferences) → generate+apply (wallpaper) → notify (notifications) → log (logger).
- **Customize screen** writes `wallpaper_settings` (preferences) — read by the generator at next render.

## How to navigate

1. Read `AGENTS.md` (global rules) — you are here.
2. Read this file (the map).
3. Identify your feature, open ONLY its `docs/features/<feature>.md`.
4. Open ONLY the source files that doc lists.
5. For testing, read `tests/CODEBASE.md` + the relevant feature doc.

## Entry points to know

- `index.js` — JS entry; imports `backgroundTask.js` before `expo-router/entry` (headless defineTask). **Do not reorder.**
- `src/app/_layout.jsx` — root navigation (Stack + splash + fonts).
- `src/app/(tabs)/_layout.jsx` — bottom tabs (Home · Names · Settings).
- `src/app/(tabs)/index.jsx` — Home screen; hosts the onboarding gate.
- `src/services/schedular/backgroundTask.js` — `TaskManager.defineTask` + task body.
- `src/services/wallpaper/rotation.js` — the single rotation routine + `rotationInFlight` guard.

## Cheap checks

- `npm run lint` — ESLint (0 errors required).
- `npm test` — Jest unit tests (logic only; no device).
- `npx expo prebuild --clean && npx expo run:android` — device build (expensive; only for native/Android changes).
