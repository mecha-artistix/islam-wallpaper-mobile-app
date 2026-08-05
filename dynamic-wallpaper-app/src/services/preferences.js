import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";

const KEYS = {
  AUTO_ROTATE: "wallpaper_auto_rotate",
  SELECTED_NAME_INDEX: "wallpaper_selected_name_index",
  ROTATION_INTERVAL_MINUTES: "wallpaper_rotation_interval_minutes",
  LAST_ROTATION: "wallpaper_last_rotation",
  WALLPAPER_SETTINGS: "wallpaper_settings",
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
