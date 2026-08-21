# Settings UI

## Purpose

The Settings hub + sub-screens. Grouped into Profile / Wallpaper / Notifications /
App. Debug/developer tooling is intentionally absent from the normal UI — the
activity log is reachable only via a long-press on the About row.

## Relevant files

- `src/app/(tabs)/settings.jsx` — the hub.
- `src/app/notifications.jsx` — wallpaper-change notification toggle.
- `src/app/about.jsx` — app purpose + privacy + version. Hidden long-press → `/logs`.
- `src/app/logs.jsx` — persistent activity log (diagnostics only).

## Main components / functions

- `SettingsScreen`:
  - **Current section** — at-a-glance state: current name + number, next name + number, interval (human-readable), last rotation (relative time, e.g. "3 min ago"), auto-rotate on/off. Refreshed on focus.
  - **Profile section** — link to `/profile`.
  - **Wallpaper section** — auto-rotate switch + interval selector + "Wallpaper appearance" link to `/customize`.
  - **Notifications section** — link to `/notifications`.
  - **App section** — About (link, with hidden long-press → logs) + Version.
- **Interval selector** (in settings.jsx) — supports BOTH:
  - **Fixed presets** (`Segmented`: 1h / 6h / Daily / Weekly).
  - **Custom input** (`TextInput` + Save, min **1 minute**, validated inline, success `Alert` popup on save).
  - The user value is stored verbatim; the OS scheduler minimum is handled separately. See `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md`.
  - When the active interval matches a preset, that preset is highlighted; otherwise none highlighted (custom).
  - The hint explains the Android ~15-min wake-up floor for sub-15-min settings.
- `handleAutoToggle(value)` — `setAutoRotate(value)` + `registerWallpaperScheduler({ force: true })`.
- `handleIntervalPreset(id)` / `handleCustomIntervalSave()` — write the interval + force re-register + `Alert.alert("Saved", ...)` on custom save.

## Data flow

```
user toggles auto-rotate / picks preset / saves custom interval
  → setAutoRotate / setRotationIntervalMinutes (preferences)
  → registerWallpaperScheduler({ force: true }) (scheduling)
```

## State / preferences

- Reads: `getProfile()`, `getAutoRotate()`, `getRotationIntervalMinutes()`.
- Writes: `setAutoRotate()`, `setRotationIntervalMinutes()`.
- Local UI state: `customInterval` (text), `intervalError` (validation message).

## Important constraints

- **Both preset AND custom input must exist.** Do not replace the custom input with only a fixed-value selector. (This was previously removed and restored — see `docs/decisions/003`.)
- **Min 1 minute** enforced at the UI validation layer. Do NOT silently change the user's value to 15.
- **Debug logs are NOT linked from normal Settings.** Only the hidden long-press on About opens `/logs`. Do not add a visible Debug Logs row.
- **No technical jargon** (WorkManager, headless, scheduler, task registration) in user-visible strings.

## External dependencies

- `expo-router` (`useRouter`, `useFocusEffect`).
- Shared UI from `src/components/ui/`.

## Related features

- **preferences** — reads/writes.
- **scheduling** — calls `registerWallpaperScheduler`.
- **onboarding-profile** — Profile link.
- **design-system** — theme + UI components.

## Known bugs / issues

- None known.
