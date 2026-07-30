import * as BackgroundTask from "expo-background-task";
import { WALLPAPER_TASK } from "./backgroundTask";
import { WALLPAPER_INTERVAL_MINUTES } from "./constants";

export async function registerWallpaperScheduler() {
  await BackgroundTask.registerTaskAsync(WALLPAPER_TASK, {
    minimumInterval: WALLPAPER_INTERVAL_MINUTES * 60,
  });

  console.log("Wallpaper scheduler registered");
}