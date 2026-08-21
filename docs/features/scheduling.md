# Scheduling (Android background task)

## Purpose

Registers and unregisters the Android WorkManager job that wakes the app to
rotate the wallpaper while it is closed. This feature is **WHEN the OS fires**,
not *which name* or *what gets drawn*.

## Relevant files

- `index.js` — JS entry. Imports `backgroundTask.js` BEFORE `expo-router/entry` so `TaskManager.defineTask` runs in a headless (app-closed) JS context. **Do not reorder.**
- `src/services/schedular/backgroundTask.js` — `TaskManager.defineTask(WALLPAPER_TASK, runWallpaperBackgroundTask)` + the task body (`runWallpaperBackgroundTask`).
- `src/services/schedular/schedular.js` — `registerWallpaperScheduler({ force })` — registers/unregisters with the OS.

## Main functions

- `runWallpaperBackgroundTask()` (in `backgroundTask.js`) — the OS-invoked body. Logs START/END, calls `rotateWallpaper({ source: "background" })`, returns `BackgroundTaskResult.Success`/`Failed`.
- `TaskManager.defineTask(WALLPAPER_TASK, runWallpaperBackgroundTask)` — must run on every bundle load (foreground + headless). Lives in `backgroundTask.js`, imported by `index.js`.
- `registerWallpaperScheduler({ force = false })` (in `schedular.js`):
  - If `autoRotate` is off → unregister if registered, return.
  - `force=false` (app start): skip if already registered (re-registering resets the WorkManager timer).
  - `force=true` (settings changed): unregister + re-register so the new interval takes effect.
  - `minimumInterval = Math.max(MIN_INTERVAL_MINUTES, floor(userMinutes))` — `MIN_INTERVAL_MINUTES = 1`. **No silent 15-min bump.**

## Data flow

```
app start / settings change
  → registerWallpaperScheduler (reads autoRotate + interval from preferences)
  → BackgroundTask.registerTaskAsync(WALLPAPER_TASK, { minimumInterval })

[app closed; interval elapses; OS has network + battery]
  → WorkManager fires the job
  → expo-task-manager loads the bundle headlessly
  → index.js → backgroundTask.js → defineTask consumer found
  → runWallpaperBackgroundTask()
  → rotateWallpaper({ source: "background" })
  → [rotation feature]
```

## State / preferences

- Reads `wallpaper_auto_rotate` and `wallpaper_rotation_interval_minutes` from preferences.
- Does not persist its own state — registration is idempotent and guarded by `TaskManager.isTaskRegisteredAsync`.

## Important constraints — CRITICAL

- **`defineTask` must run from `index.js` (JS entry), NOT from a layout/screen.** Expo Router only evaluates layout files when `ExpoRoot` mounts, which never happens in a headless (app-closed) context. See `docs/decisions/002-defineTask-from-js-entry.md`.
- **The user interval is passed through verbatim (min 1).** Android WorkManager may internally floor the OS wake-up cadence to ~15 min; that is platform behavior. `shouldRotate()` (rotation feature) honors the user's value. See `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md`.
- **Re-registering resets the WorkManager timer** — so on app start, skip if already registered. Only settings changes force a re-register.
- **`unregisterTaskAsync` rejects if the task was never registered** — guarded with `isTaskRegisteredAsync` before unregistering.

## External dependencies

- `expo-background-task` (`BackgroundTask.registerTaskAsync`, `unregisterTaskAsync`, `BackgroundTaskResult`).
- `expo-task-manager` (`TaskManager.defineTask`, `isTaskRegisteredAsync`).
- Android WorkManager (via expo-background-task native code).

## Related features

- **rotation** — the task body calls `rotateWallpaper`.
- **preferences** — reads autoRotate + interval.
- **logger** — task body logs START/END/failures.

## Known bugs / issues

- **OS-level invocation is NOT verified by automated tests.** `npm test` covers the JS body logic only. A passing `runWallpaperBackgroundTask()` call does NOT prove the OS schedules the task. See `tests/MANUAL-CHECKLIST.md` for device verification.
- Previous bug: `defineTask` was imported from `_layout.jsx`, so it never ran headlessly → WorkManager fired but no JS consumer → queued + flushed at next open. Fixed in commit `684455a`. Do not reintroduce.
