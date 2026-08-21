# Notifications

## Purpose

Local notifications for wallpaper-change events. Gated by the user's
notification settings. Works headless (background rotation) and in components.

## Relevant files

- `src/services/notifications.js` — `sendAppNotification`, `notifyWallpaperChanged`, `ensureNotificationPermission`, the global `Notifications.setNotificationHandler`.
- `src/app/notifications.jsx` — the settings sub-screen with the wallpaper-change toggle.
- `src/app/(tabs)/settings.jsx` — links to the notifications screen.

## Main functions

- `notifyWallpaperChanged(name)` — gated by `notification_settings.wallpaperChange`; no-op when disabled. Posts a local notification with transliteration + translation.
- `sendAppNotification(title, body)` — creates the channel (Android), requests permission if needed, schedules the notification.
- `ensureNotificationPermission()` — requests `POST_NOTIFICATIONS` (Android 13+) if not already granted.

## Data flow

```
applyWallpaper (rotation) → notifyWallpaperChanged(name)
  → getNotificationSettings() (preferences)
  → if disabled: return
  → else: ensureNotificationPermission → scheduleNotificationAsync (immediate)
```

## State / preferences

- `notification_settings.wallpaperChange` (bool, default `false`). Stored as JSON in SecureStore. Adding a new notification type = a new key here + a toggle row.

## Important constraints

- **The trigger MUST reference the channelId.** `scheduleNotificationAsync` is called with `trigger: { channelId: CHANNEL_ID }` (the `ChannelAwareTriggerInput` type). Using `trigger: null` fires immediately but attaches NO channel — on Android 8+ a channel-less notification is **silently dropped**. This was a real bug (no notification appeared on background rotation) — fixed by attaching the channel to the trigger.
- `Notifications.setNotificationHandler` is set at module load so foreground notifications show a banner (otherwise they're silently dropped). Do not remove it.
- `expo-notifications` is in `app.json` plugins (declares `POST_NOTIFICATIONS` for Android 13+ + sets up the module at build time). Requires `npx expo prebuild --clean` to take effect.
- The notification is **not** the rotation mechanism — it only alerts the user that a change happened.
- No backend / push notifications yet — local only.

## External dependencies

- `expo-notifications` — local notifications, channel management, permissions.

## Related features

- **rotation** — `applyWallpaper` calls `notifyWallpaperChanged`.
- **preferences** — `notification_settings`.
- **settings-ui** — the toggle screen.

## Known bugs / issues

- None known. Permission denial is handled (the toggle refuses to turn on if permission is denied, with an alert directing the user to system settings).
