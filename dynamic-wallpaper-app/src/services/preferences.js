import * as SecureStore from "expo-secure-store";

const KEYS = {
  AUTO_ROTATE: "wallpaper_auto_rotate",
  SELECTED_NAME_INDEX: "wallpaper_selected_name_index",
  ROTATION_INTERVAL_MINUTES: "wallpaper_rotation_interval_minutes",
  LAST_ROTATION: "wallpaper_last_rotation",
};

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
