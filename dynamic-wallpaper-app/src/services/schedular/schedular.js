import * as BackgroundTask from "expo-background-task";
import { WALLPAPER_TASK } from "./backgroundTask";
import { getAutoRotate, getRotationIntervalMinutes } from "../preferences";

// Android WorkManager hard minimum is 15 minutes.
// shouldRotate() handles finer-grained timing for intervals > 15 min.
const ANDROID_MIN_INTERVAL_MINUTES = 15;

export async function registerWallpaperScheduler() {
  const autoRotate = await getAutoRotate();

  if (!autoRotate) {
    await BackgroundTask.unregisterTaskAsync(WALLPAPER_TASK);
    return;
  }

  const intervalMinutes = await getRotationIntervalMinutes();
  const minimumInterval = Math.max(ANDROID_MIN_INTERVAL_MINUTES, Math.floor(intervalMinutes));

  // Always unregister first — registerTaskAsync is a no-op if already registered,
  // so without this the interval change from settings would never take effect.
  await BackgroundTask.unregisterTaskAsync(WALLPAPER_TASK);
  await BackgroundTask.registerTaskAsync(WALLPAPER_TASK, { minimumInterval });
}
