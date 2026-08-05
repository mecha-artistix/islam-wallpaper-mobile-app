import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { tryRotateWallpaper, sendRotationNotification } from "../wallpaper/rotation";

export const WALLPAPER_TASK = "wallpaper-task";

TaskManager.defineTask(WALLPAPER_TASK, async () => {
  console.log(`[BGTask] ▶ fired at ${new Date().toISOString()}`);
  try {
    const name = await tryRotateWallpaper();
    if (name) {
      await sendRotationNotification(name);
      console.log(`[BGTask] ✓ rotated to ${name.transliteration}`);
    } else {
      console.log("[BGTask] ⏭ skipped — interval not elapsed");
    }
    return BackgroundTaskResult.Success;
  } catch (e) {
    console.error(`[BGTask] ✗ FAILED: ${e.message}`);
    console.error(`[BGTask] stack: ${e.stack}`);
    return BackgroundTaskResult.Failed;
  }
});
