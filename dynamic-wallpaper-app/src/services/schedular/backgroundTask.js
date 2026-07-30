import * as TaskManager from "expo-task-manager";

export const WALLPAPER_TASK = "wallpaper-task";

TaskManager.defineTask(WALLPAPER_TASK, async () => {
  try {
    console.log("Background wallpaper task");

    // We'll call the wallpaper service here later

    return TaskManager.BackgroundTaskResult.Success;
  } catch (e) {
    console.error(e);

    return TaskManager.BackgroundTaskResult.Failed;
  }
});