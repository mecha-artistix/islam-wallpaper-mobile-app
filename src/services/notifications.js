import * as Notifications from "expo-notifications";
import { getNotificationSettings } from "./preferences";

const CHANNEL_ID = "wallpaper";

// Without this, notifications posted while the app is in the FOREGROUND are
// silently dropped (default handler shows nothing). Show banner + list always.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Requests POST_NOTIFICATIONS (Android 13+) if not already granted.
// Returns whether notifications can be shown.
export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Reusable notification entry point for the whole app: takes a title + body,
// fires a local notification, never throws. Any feature that needs to notify
// should call this (gated by its own setting) — debugging and improvements
// live in this one place. Works headless (background task) and in components.
export async function sendAppNotification(title, body) {
  try {
    if (!(await ensureNotificationPermission())) return false;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Wallpaper updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: null, // immediate
    });
    return true;
  } catch (e) {
    console.error("[Notify] failed:", e.message);
    return false;
  }
}

// Wallpaper-change notification — gated by the notification_settings toggle.
// Called after every successful wallpaper set: background rotation, foreground
// rotation, manual set from the detail page, and Set Wallpaper in the editor.
export async function notifyWallpaperChanged(name) {
  const settings = await getNotificationSettings();
  if (!settings.wallpaperChange) return;
  await sendAppNotification("Wallpaper updated", `${name.transliteration} — ${name.translation}`);
}
