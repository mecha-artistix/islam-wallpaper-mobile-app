import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { rotateWallpaper } from "../wallpaper/rotation";
import { logEvent } from "../logger";
console.log("backgroundTask.js loaded");
export const WALLPAPER_TASK = "wallpaper-task";

// Headless entry point for the OS-scheduled wallpaper change. expo-background-task
// never runs while the app is in the foreground (enforced natively), and the
// WorkManager job requires network connectivity. All logs go through the
// persistent logger so background runs are visible in Settings → Debug Logs.

export async function runWallpaperBackgroundTask() {
   const id = Date.now();

  await logEvent("bgtask", `START ${id}`);
  await logEvent("bgtask", "fired");

  try {
    const name = await rotateWallpaper({ source: "background" });

    await logEvent(
      "bgtask",
      name
        ? `rotated to ${name.transliteration}`
        : "skipped — interval not elapsed"
    );
    await logEvent("bgtask", `END ${id}`);
    return BackgroundTaskResult.Success;
  } catch (e) {
    await logEvent("bgtask", `failed: ${e.message}`);
    await logEvent("bgtask", `END ${id}`);
    return BackgroundTaskResult.Failed;
  }
}


TaskManager.defineTask(WALLPAPER_TASK,runWallpaperBackgroundTask);
