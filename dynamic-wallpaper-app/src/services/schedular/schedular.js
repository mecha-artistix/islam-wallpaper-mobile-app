import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { WALLPAPER_TASK } from "./backgroundTask";
import { getAutoRotate, getRotationIntervalMinutes } from "../preferences";

// The native library tracks registrations with a counter (numberOfRegisteredTasksOfThisType).
// A single unregisterTaskAsync only decrements by 1. If the task was registered N times
// (due to repeated calls), you need N unregisters to reach 0 and actually stop WorkManager.
// This function drains the counter fully.
async function drainRegistrations() {
  let attempts = 0;
  while ((await TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK)) && attempts < 10) {
    await BackgroundTask.unregisterTaskAsync(WALLPAPER_TASK);
    attempts++;
  }
  console.log(`[Scheduler] drained ${attempts} registration(s)`);
}

// force=false (default): skip if already registered — preserves the running WorkManager timer.
// force=true: fully drain + re-register — use when settings change (interval or autoRotate).
export async function registerWallpaperScheduler({ force = false } = {}) {
  const autoRotate = await getAutoRotate();
  console.log(`[Scheduler] registerWallpaperScheduler — autoRotate: ${autoRotate}, force: ${force}`);

  if (!autoRotate) {
    console.log("[Scheduler] auto rotate off — draining and unregistering");
    await drainRegistrations();
    return;
  }

  if (!force) {
    const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK);
    if (alreadyRegistered) {
      console.log("[Scheduler] task already running — skipping to preserve timer");
      return;
    }
  }

  const intervalMinutes = await getRotationIntervalMinutes();
  // expo-background-task uses OneTimeWorkRequest on Android O+, not PeriodicWorkRequest,
  // so the 15-min Android floor does not apply. Minimum 1 to avoid passing 0.
  const minimumInterval = Math.max(1, Math.round(intervalMinutes));
  console.log(`[Scheduler] (re)registering — interval: ${minimumInterval} min`);

  // Drain all existing registrations so the counter reaches 0 and WorkManager
  // actually stops the old job before we create a fresh single one.
  await drainRegistrations();
  await BackgroundTask.registerTaskAsync(WALLPAPER_TASK, { minimumInterval });

  const tasks = await TaskManager.getRegisteredTasksAsync();
  console.log(`[Scheduler] registered tasks:`, JSON.stringify(tasks));
}
