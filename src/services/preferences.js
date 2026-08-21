import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";

const KEYS = {
  AUTO_ROTATE: "wallpaper_auto_rotate",
  SELECTED_NAME_INDEX: "wallpaper_selected_name_index",
  ROTATION_INTERVAL_MINUTES: "wallpaper_rotation_interval_minutes",
  LAST_ROTATION: "wallpaper_last_rotation",
  WALLPAPER_SETTINGS: "wallpaper_settings",
  NOTIFICATION_SETTINGS: "notification_settings",
  // Onboarding / profile (added in the redesign). Name and email are optional
  // and stored locally only — structured so a backend could replace these
  // accessors later without touching callers.
  ONBOARDING_COMPLETED: "onboarding_completed",
  USER_NAME: "user_name",
  USER_EMAIL: "user_email",
};

// User-saved presets live in a file, not SecureStore — a presets list quickly
// exceeds SecureStore's ~2KB per-key value limit.
const presetsFile = new File(Paths.document, "wallpaper_presets.json");

export async function getAutoRotate() {
  const value = await SecureStore.getItemAsync(KEYS.AUTO_ROTATE);
  return value === null ? true : value === "true"; // default: enabled
}

export async function setAutoRotate(enabled) {
  await SecureStore.setItemAsync(KEYS.AUTO_ROTATE, String(enabled));
}

export async function getSelectedNameIndex() {
  const value = await SecureStore.getItemAsync(KEYS.SELECTED_NAME_INDEX);
  return value ? parseInt(value, 10) : 0;
}

export async function setSelectedNameIndex(index) {
  await SecureStore.setItemAsync(KEYS.SELECTED_NAME_INDEX, String(index));
}

export async function getRotationIntervalMinutes() {
  const value = await SecureStore.getItemAsync(KEYS.ROTATION_INTERVAL_MINUTES);
  return value ? parseFloat(value) : 1440;
}

export async function setRotationIntervalMinutes(minutes) {
  await SecureStore.setItemAsync(KEYS.ROTATION_INTERVAL_MINUTES, String(minutes));
}

export async function getLastRotation() {
  const value = await SecureStore.getItemAsync(KEYS.LAST_ROTATION);
  return value ? parseInt(value, 10) : null;
}

export async function setLastRotation(timestamp) {
  await SecureStore.setItemAsync(KEYS.LAST_ROTATION, String(timestamp));
}

export async function resetRotationIndex() {
  await SecureStore.setItemAsync(KEYS.SELECTED_NAME_INDEX, "0");
  await SecureStore.setItemAsync(KEYS.LAST_ROTATION, String(Date.now()));
}

export async function shouldRotate() {
  const autoRotate = await getAutoRotate();
  if (!autoRotate) return false;

  const intervalMinutes = await getRotationIntervalMinutes();
  const lastRotation = await getLastRotation();
  if (!lastRotation) return true;

  const minutesSinceLastRotation = (Date.now() - lastRotation) / (1000 * 60);
  return minutesSinceLastRotation >= intervalMinutes;
}

// Wallpaper appearance (the wallpaperSettings object from services/wallpaper/settings.js).
// Returns the raw saved object (possibly partial) — callers merge over defaults.
export async function getWallpaperSettings() {
  const raw = await SecureStore.getItemAsync(KEYS.WALLPAPER_SETTINGS);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setWallpaperSettings(settings) {
  await SecureStore.setItemAsync(KEYS.WALLPAPER_SETTINGS, JSON.stringify(settings));
}

// Notification preferences: one JSON object so new notification types are just
// a new key here + a toggle in the notifications settings screen.
const DEFAULT_NOTIFICATION_SETTINGS = {
  wallpaperChange: false,
};

export async function getNotificationSettings() {
  const raw = await SecureStore.getItemAsync(KEYS.NOTIFICATION_SETTINGS);
  if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export async function setNotificationSetting(key, value) {
  const current = await getNotificationSettings();
  const next = { ...current, [key]: value };
  await SecureStore.setItemAsync(KEYS.NOTIFICATION_SETTINGS, JSON.stringify(next));
  return next;
}

// ─── Onboarding & profile ────────────────────────────────────────────────────
// Onboarding is shown once on first launch. Name/email are always optional —
// the app works fully without them. Stored locally; a backend could replace
// these accessors later without touching callers.

export async function getOnboardingCompleted() {
  const value = await SecureStore.getItemAsync(KEYS.ONBOARDING_COMPLETED);
  return value === "true";
}

export async function setOnboardingCompleted(value = true) {
  await SecureStore.setItemAsync(KEYS.ONBOARDING_COMPLETED, String(value));
}

// Returns { name, email } — both null when not provided.
export async function getProfile() {
  const [name, email] = await Promise.all([
    SecureStore.getItemAsync(KEYS.USER_NAME),
    SecureStore.getItemAsync(KEYS.USER_EMAIL),
  ]);
  return { name, email };
}

export async function setProfile({ name, email }) {
  if (name !== undefined) {
    const v = name && name.trim() ? name.trim() : null;
    if (v) await SecureStore.setItemAsync(KEYS.USER_NAME, v);
    else await SecureStore.deleteItemAsync(KEYS.USER_NAME);
  }
  if (email !== undefined) {
    const v = email && email.trim() ? email.trim() : null;
    if (v) await SecureStore.setItemAsync(KEYS.USER_EMAIL, v);
    else await SecureStore.deleteItemAsync(KEYS.USER_EMAIL);
  }
}

// Minimal email validation — used only to show inline feedback, never to block.
export function isValidEmail(email) {
  if (!email) return true; // empty is valid (email is optional)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// User presets: array of { name, settings }. Built-in presets are NOT stored —
// they come from BUILT_IN_PRESETS in settings.js.
export async function getWallpaperPresets() {
  try {
    if (!presetsFile.exists) return [];
    return JSON.parse(await presetsFile.text());
  } catch {
    return [];
  }
}

export async function saveWallpaperPreset(name, settings) {
  const presets = await getWallpaperPresets();
  presets.push({ name, settings });
  presetsFile.write(JSON.stringify(presets));
  return presets;
}

export async function deleteWallpaperPreset(name) {
  const presets = (await getWallpaperPresets()).filter((p) => p.name !== name);
  presetsFile.write(JSON.stringify(presets));
  return presets;
}
