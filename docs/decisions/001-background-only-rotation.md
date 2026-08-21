# ADR 001 — Background-only rotation

**Date:** 2025 (this change set)
**Status:** Accepted

## Decision

Automatic wallpaper rotation happens **only** via the Android background task
(`expo-background-task` + `expo-task-manager` + WorkManager). There is no
foreground rotation mechanism.

## Reason

- The app's premise is "set it once, and let the app quietly bring a new Name
  to your screen." A foreground timer would drain battery, fight the OS
  background scheduler, and double-rotate when both fire.
- `expo-background-task` natively skips execution while the app is foregrounded
  (verified in `BackgroundTaskScheduler.kt`), so a foreground timer would be
  fighting the platform's own model.
- The OS scheduler + `shouldRotate()` (elapsed-time gate) cover all real cases:
  the task fires, the gate decides if a rotation is due, and the wallpaper
  changes once. No polling needed.

## Alternatives considered

1. **Foreground `setTimeout` chain in `_layout.jsx`.** Rejected — duplicate
   path, battery cost, double-rotation risk. (This existed in an early design
   doc but was never in the shipped code; this ADR formalizes its absence.)
2. **`AppState`-based rotation** (rotate on background→foreground transition).
   Rejected — surprising behavior, races with the background task, and "rotate
   on resume" is not a user-requested feature.
3. **Manual-only** (no automatic rotation at all). Rejected — automatic rotation
   is a core product feature.

## Consequences

- The app does NOT rotate while open. A user looking at an open Home screen will
  not see the wallpaper change in front of them. This is acceptable — the
  preview is the in-app hero; the actual device wallpaper changes quietly.
- A manually-invoked `runWallpaperBackgroundTask()` (the "Rotate Now" button /
  test) is the only foreground path, and it is explicitly user-triggered.

## Things future agents must NOT reintroduce

- Any `setInterval` / `setTimeout` that calls `rotateWallpaper` or
  `applyWallpaper` automatically.
- Any `AppState` listener that triggers rotation.
- Any `useEffect` loop that auto-rotates on mount/focus.
- A foreground "rotation scheduler" of any kind.

If you believe a foreground path is needed, open a new ADR superseding this one
and justify it with a demonstrated product or technical requirement.
