# ADR 003 — User interval vs OS scheduler minimum

**Date:** 2025 (this change set)
**Status:** Accepted

## Decision

The user's rotation interval is **stored verbatim** (minimum 1 minute). The OS
scheduler is given `Math.max(1, floor(userMinutes))` at registration. The
app-level `shouldRotate()` elapsed-time gate compares `now - lastRotation`
against the **user's** value, independent of the OS wake-up cadence.

These two layers are intentionally separate:

| Layer | What it controls | Min value |
|---|---|---|
| **User setting** (`wallpaper_rotation_interval_minutes`) | "How often the user wants a new wallpaper" | 1 minute |
| **OS scheduler** (`BackgroundTask.registerTaskAsync({ minimumInterval })`) | "How often WorkManager wakes the app" | ~15 min (Android platform behavior; not our setting) |
| **`shouldRotate()`** (app-level gate) | "Is a rotation actually due?" | honors the user's value |

## Reason

A previous change removed the custom interval input and silently treated the
interval as if it had a 15-minute floor. This was wrong:

- The user may want a 1-minute interval (for testing, or because they want
  frequent changes).
- Android WorkManager may floor its wake-up cadence to ~15 minutes — that is a
  platform constraint, not a product decision. We should not pretend it's the
  user's choice.
- If the OS wakes late (e.g. 20 min after a 1-min setting), `shouldRotate()`
  still returns true and the rotation proceeds. If the OS wakes early
  (shouldn't happen, but defensively), `shouldRotate()` skips. The user's
  intent is honored.

## Alternatives considered

1. **Clamp the user value to 15 minutes everywhere.** Rejected — silently
   changes the user's setting, and a 1-minute test interval is genuinely useful.
2. **Expose only fixed presets (1h/6h/Daily/Weekly).** Rejected — removes the
   custom-input feature the user expects.
3. **Store 1 minute but tell the OS 15 minutes and never rotate before 15 min.**
   Rejected — conflates the user's intent with the platform's cadence;
   `shouldRotate()` already handles "rotate when due, skip when not".

## Consequences

- The UI offers BOTH fixed presets AND a custom input (min 1). When the active
  value matches a preset, the preset is highlighted; otherwise none.
- A user setting `1 minute` will see the OS wake on its own cadence (often
  ~15 min), but each wake will rotate (because `shouldRotate()` returns true
  once ≥1 min has elapsed). This is the intended behavior.
- The UI includes a hint explaining this distinction to the user.

## Things future agents must NOT reintroduce

- Silently changing the user's interval to 15 minutes at storage or
  registration time.
- Removing the custom interval input in favor of only fixed presets.
- Imposing a 15-minute minimum on the user's setting (the UI minimum is 1).
- Coupling `shouldRotate()` to the OS scheduler's minimum — it must compare
  against the user's value only.

If the platform raises its minimum in a future SDK, document it in
`docs/features/scheduling.md` and `tests/MANUAL-CHECKLIST.md`; do NOT change
the user-facing contract.
