import * as SecureStore from "expo-secure-store";

const KEY = "current-wallpaper-index";

export async function getCurrentWallpaperIndex() {
  const value = await SecureStore.getItemAsync(KEY);

  if (value === null) {
    return 0;
  }

  return Number(value);
}

export async function setCurrentWallpaperIndex(index) {
  await SecureStore.setItemAsync(KEY, String(index));
}

export async function getNextWallpaperIndex(totalWallpapers) {
  const current = await getCurrentWallpaperIndex();

  const next = (current + 1) % totalWallpapers;

  await setCurrentWallpaperIndex(next);

  return next;
}