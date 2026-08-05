import * as TaskManager from "expo-task-manager";
import { BackgroundTaskResult } from "expo-background-task";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { generateWallpaperImage } from "../wallpaper/generator";
import { setDeviceWallpaper } from "../wallpaper/manager";
import {
  getSelectedNameIndex,
  setSelectedNameIndex,
  setLastRotation,
  shouldRotate,
} from "../preferences";

export const WALLPAPER_TASK = "wallpaper-task";

TaskManager.defineTask(WALLPAPER_TASK, async () => {
  try {
    const rotate = await shouldRotate();
    if (!rotate) return BackgroundTaskResult.Success;

    const currentIndex = await getSelectedNameIndex();
    const nextIndex = (currentIndex + 1) % ASMA_UL_HUSNA.length;
    const selectedName = ASMA_UL_HUSNA[nextIndex];

    const wallpaperUri = await generateWallpaperImage(selectedName);
    await setDeviceWallpaper(wallpaperUri);
    await setSelectedNameIndex(nextIndex);
    await setLastRotation(Date.now());

    return BackgroundTaskResult.Success;
  } catch (e) {
    console.error("Background wallpaper task failed:", e);
    return BackgroundTaskResult.Failed;
  }
});
