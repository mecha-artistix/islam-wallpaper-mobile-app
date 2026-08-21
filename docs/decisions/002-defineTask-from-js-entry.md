# ADR 002 — `defineTask` runs from the JS entry (`index.js`)

**Date:** 2025 (commit `684455a`)
**Status:** Accepted

## Decision

`TaskManager.defineTask(WALLPAPER_TASK, runWallpaperBackgroundTask)` is invoked
from `src/services/schedular/backgroundTask.js`, which is imported by `index.js`
(the JS entry, `package.json#main`) **before** `expo-router/entry`.

## Reason

For the Android background task to run while the app is CLOSED, the JS consumer
(`defineTask`) MUST execute when the bundle loads in a **headless** JS context.

Expo Router's entry registers `ExpoRoot` via `AppRegistry`, but route/layout
modules (including `src/app/_layout.jsx`) are only evaluated when `ExpoRoot`
actually mounts — which **never happens** in a headless context (no Activity /
no UI host). So importing `backgroundTask.js` from `_layout.jsx` does NOT
register the consumer headlessly.

This was the root cause of a real bug: WorkManager fired on schedule, found no
JS consumer, queued the firings natively, and replayed them as a burst at the
next foreground launch — so the wallpaper "never rotated in the background".

Importing `backgroundTask.js` from `index.js` (before `expo-router/entry`)
guarantees `defineTask` runs on every bundle load (foreground AND headless).

## Alternatives considered

1. **Import from `_layout.jsx`.** Rejected — doesn't run headlessly (see above).
2. **Import from a route file.** Rejected — same problem; route files are
   layout-evaluated.
3. **Use a separate headless entry (RN `AppRegistry.registerHeadlessTask`).**
   Rejected — `expo-task-manager` already wires its own headless entry; the
   only requirement is that `defineTask` has run by the time it flushes. The
   `index.js` import satisfies this without a second entry point.

## Consequences

- There are now two JS entries conceptually: `index.js` (app entry, runs on
  every bundle load including headless) and `expo-router/entry` (the router).
  `index.js` imports the router, so both run in the foreground case; only
  `index.js`'s top-level imports run in the headless case.
- The splash screen must be hidden from a route (Home does it after the
  onboarding gate), not from `_layout.jsx`'s module load — but that's already
  the case.

## Things future agents must NOT reintroduce

- Moving the `import "./src/services/schedular/backgroundTask"` out of `index.js`
  into `_layout.jsx` or any route/screen/component.
- Reordering `index.js` so `expo-router/entry` imports before `backgroundTask.js`.
- Adding a guard that skips `defineTask` in headless contexts.

If you need to add another headless-required side effect, add it to `index.js`
(before the router import), not to a layout.
