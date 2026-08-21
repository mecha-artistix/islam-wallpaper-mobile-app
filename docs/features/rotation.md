# Rotation (which name + whether due)

## Purpose

Decides WHICH name to rotate to and WHETHER a rotation is currently due. This is
the app-level timing/logic layer — it is NOT the OS scheduler (see
`scheduling.md`) and NOT the wallpaper generator (see `wallpaper.md`).

## Relevant files

- `src/services/wallpaper/rotation.js` — `rotateWallpaper({ force, source })`, `applyWallpaper({ uri, name, index, source })`, `rotationInFlight` guard.
- Rotation accessors in `src/services/preferences.js`:
  - `shouldRotate()` — elapsed-time gate (compares now vs `lastRotation` against the user's interval).
  - `getRotationIntervalMinutes()` / `setRotationIntervalMinutes(minutes)`.
  - `getLastRotation()` / `setLastRotation(ts)`.
  - `getSelectedNameIndex()` / `setSelectedNameIndex(i)`.
  - `resetRotationIndex()` — index → 0, lastRotation → now.

## Main functions

- `rotateWallpaper({ force = false, source = "background" })` → `Promise<name|null>`
  - If `rotationInFlight` → returns `null` (skip).
  - Sets `rotationInFlight = true` **before the first await** (guards against queued concurrent OS firings flushed at app open).
  - If `!force && !shouldRotate()` → returns `null`.
  - Computes `nextIndex = (current + 1) % 99`, generates, applies.
  - `finally { rotationInFlight = false }` — always cleared (success + failure).
- `applyWallpaper({ uri, name, index, source })` → set wallpaper, persist index + clock, notify, log.

## Data flow

```
rotateWallpaper
  → shouldRotate()              [preferences — elapsed-time gate]
  → getSelectedNameIndex()      [preferences]
  → generateWallpaperImage(name) [wallpaper]
  → applyWallpaper
      → setDeviceWallpaper(uri)  [wallpaper → native]
      → setSelectedNameIndex(i)
      → setLastRotation(Date.now())
      → notifyWallpaperChanged(name)  [notifications]
      → logEvent(...)            [logger]
```

## State / preferences

- `wallpaper_rotation_interval_minutes` — float, **min 1** (user's value, stored verbatim).
- `wallpaper_last_rotation` — timestamp ms (null = never).
- `wallpaper_selected_name_index` — int 0..98.
- `wallpaper_auto_rotate` — bool.

## Important constraints — CRITICAL

- **`rotationInFlight` must be set before the first await.** Setting it after would let queued concurrent OS events (flushed at app open) each pass the guard and double-advance the index. Do not move it.
- **`rotationInFlight` must be cleared in `finally`.** A failure path that returns without clearing would permanently block future rotations. Do not change the try/finally structure without preserving this.
- **`shouldRotate()` honors the USER's interval, not the OS scheduler's.** Android WorkManager may wake on a longer cadence (often ~15 min); `shouldRotate()` compares elapsed time against the user's value so a late OS wake still rotates, and an early one (defensively) skips. See `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md`.
- **No foreground rotation.** This routine is called from: the background task, manual Set, and the "Rotate Now" debug button. There is no timer/polling caller. See `docs/decisions/001-background-only-rotation.md`.

## External dependencies

- None beyond `wallpaper`, `preferences`, `notifications`, `logger`.

## Related features

- **scheduling** — `backgroundTask.js` calls `rotateWallpaper({ source: "background" })`.
- **wallpaper** — `rotateWallpaper` calls generate + apply.
- **preferences** — rotation state lives here (accessors above).
- **notifications** — `applyWallpaper` calls `notifyWallpaperChanged`.
- **app-ui** — Home / Detail call `applyWallpaper` directly (manual path); "Rotate Now" calls `rotateWallpaper({ force: true, source: "test" })`.

## Known bugs / issues

- None known. The previous "burst of rotations at app open" bug was caused by `defineTask` not running headlessly — fixed in commit `684455a` (see `docs/decisions/002-defineTask-from-js-entry.md`). The in-flight guard prevents the burst from double-advancing the index.
