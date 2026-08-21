# Preferences (persistence)

## Purpose

The leaf persistence layer. All app state that must survive restarts lives here,
via `expo-secure-store` (key-value) and `expo-file-system` (presets JSON + logs).

## Relevant files

- `src/services/preferences.js` — all SecureStore accessors + presets file + onboarding/profile + `shouldRotate()` + `isValidEmail()`.
- `src/services/logger.js` — persistent ring-buffer log written to a JSON file.

## Keys (SecureStore)

| Key | Type | Default | Accessors |
|---|---|---|---|
| `wallpaper_auto_rotate` | bool | `true` | `getAutoRotate` / `setAutoRotate` |
| `wallpaper_selected_name_index` | int 0..98 | `0` | `getSelectedNameIndex` / `setSelectedNameIndex` |
| `wallpaper_rotation_interval_minutes` | float | `1440` (24h) | `getRotationIntervalMinutes` / `setRotationIntervalMinutes` — **min 1, stored verbatim** |
| `wallpaper_last_rotation` | ts ms | `null` | `getLastRotation` / `setLastRotation` |
| `wallpaper_settings` | JSON | `DEFAULT_WALLPAPER_SETTINGS` | `getWallpaperSettings` / `setWallpaperSettings` |
| `notification_settings` | JSON | `{ wallpaperChange: false }` | `getNotificationSettings` / `setNotificationSetting` |
| `onboarding_completed` | bool | `false` | `getOnboardingCompleted` / `setOnboardingCompleted` |
| `user_name` | string | `null` | `getProfile` / `setProfile` |
| `user_email` | string | `null` | `getProfile` / `setProfile` |

## Files (expo-file-system)

- `Paths.document/wallpaper_presets.json` — user-saved appearance presets (`getWallpaperPresets` / `saveWallpaperPreset` / `deleteWallpaperPreset`). A file (not SecureStore) because a presets list exceeds SecureStore's ~2KB value limit.
- `Paths.document/app_logs.json` — the persistent log (see `logger.js`).

## Main functions

- `shouldRotate()` — **elapsed-time gate**: returns `autoRotate && (lastRotation == null || now - lastRotation >= intervalMinutes)`. Honors the USER's interval, not the OS scheduler's.
- `resetRotationIndex()` — index → 0, lastRotation → now.
- `mergeSettings(partial)` (in `wallpaper/settings.js`, not here) — deep-merge saved wallpaper settings over defaults.
- `isValidEmail(email)` — `true` for empty (email optional); `^[^\s@]+@[^\s@]+\.[^\s@]+$` otherwise.
- `getProfile()` → `{ name, email }` (both `null` when not set).
- `setProfile({ name, email })` — trims, blank → `null`, deletes the key.

## Data flow

Reads/writes go straight to SecureStore (or the presets file). No cache — every
accessor is async. Callers should not memoize across settings changes unless
they also subscribe to a focus event (the Settings screen does this).

## Important constraints

- **`setRotationIntervalMinutes` stores the value verbatim.** Do NOT clamp to 15 here — the UI validates `>= 1`, and `shouldRotate()` honors the raw value. See `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md`.
- **`shouldRotate()` compares against the user's interval, not the OS minimum.** This is the layer that decouples "what the user asked for" from "when the OS wakes".
- **Profile is local-only.** Name/email are stored on device. Structured so a backend could replace these accessors later without touching callers.
- **`isValidEmail` never blocks** — it's inline feedback only. Empty is valid (email optional).

## External dependencies

- `expo-secure-store` — encrypted key-value.
- `expo-file-system` — `File` / `Paths` API for the presets + logs JSON files.

## Related features

- Every other feature reads/writes here. This is the leaf — it imports nothing from `src/`.

## Known bugs / issues

- None known. SecureStore has a ~2KB per-value limit — large objects go to the file system (presets, logs).
