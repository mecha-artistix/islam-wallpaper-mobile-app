import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { rotateWallpaper } from "../wallpaper/rotation";

export const WALLPAPER_TASK = "wallpaper-task";

// NOTE: expo-background-task never runs while the app is in the foreground
// (enforced natively), and the WorkManager job requires network connectivity.
// Rotation while the app is open is handled by the timer in app/_layout.jsx.
TaskManager.defineTask(WALLPAPER_TASK, async () => {
  console.log(`[BGTask] ▶ fired at ${new Date().toISOString()}`);
  try {
    const name = await rotateWallpaper();
    console.log(name ? `[BGTask] ✓ rotated to ${name.transliteration}` : "[BGTask] ⏭ skipped — interval not elapsed");
    return BackgroundTaskResult.Success;
  } catch (e) {
    console.error(`[BGTask] ✗ failed: ${e.message}`);
    return BackgroundTaskResult.Failed;
  }
});
