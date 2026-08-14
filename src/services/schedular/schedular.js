import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { WALLPAPER_TASK } from "./backgroundTask";
import { getAutoRotate, getRotationIntervalMinutes } from "../preferences";

// The user's interval is passed to WorkManager as-is (minutes). Modern devices
// can fire well below the documented 15-minute guideline; the OS still treats
// the value as a minimum delay, and shouldRotate() enforces the exact timing.
const MIN_INTERVAL_MINUTES = 1;

// force=false (app start): skip if already registered. Re-registering resets the
// WorkManager timer, so registering on every app open could push a 24h rotation
// back indefinitely for a user who opens the app daily. It would also corrupt
// the native registration counter (BackgroundTaskScheduler counts registerTask
// calls in-memory and only schedules when it hits exactly 1).
// force=true (settings changed): unregister + re-register so the new interval
// takes effect immediately.
export async function registerWallpaperScheduler({ force = false } = {}) {
  const autoRotate = await getAutoRotate();

  if (!autoRotate) {
    if (await TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK)) {
      await BackgroundTask.unregisterTaskAsync(WALLPAPER_TASK);
    }
    return;
  }

  if (!force && (await TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK))) {
    return;
  }

  const intervalMinutes = await getRotationIntervalMinutes();
  const minimumInterval = Math.max(MIN_INTERVAL_MINUTES, Math.floor(intervalMinutes));

  // Unregistering a task that was never registered rejects — without this guard
  // the register call below never runs on a fresh install and nothing is scheduled.
  if (await TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK)) {
    await BackgroundTask.unregisterTaskAsync(WALLPAPER_TASK);
  }
  await BackgroundTask.registerTaskAsync(WALLPAPER_TASK, { minimumInterval });
}
