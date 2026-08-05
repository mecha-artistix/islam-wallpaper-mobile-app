import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import {
  getSelectedNameIndex,
  setSelectedNameIndex,
  setLastRotation,
  shouldRotate,
} from "../preferences";
import { generateWallpaperImage } from "./generator";
import { setDeviceWallpaper } from "./manager";

// Single rotation implementation shared by the OS background task
// (schedular/backgroundTask.js), the foreground timer (app/_layout.jsx), and
// the "Rotate Now" button in settings.
// Returns the name rotated to, or null when the interval hasn't elapsed.

// expo-background-task never runs while the app is in the foreground (native
// inForeground check), and the FG timer can tick at the same moment the OS
// fires the task — the guard makes the second caller skip instead of
// double-advancing the index.
let rotationInFlight = false;

// force=true skips the shouldRotate() gate (used by the settings debug button).
export async function rotateWallpaper({ force = false } = {}) {
  if (rotationInFlight) {
    console.log("[Rotation] ⏭ skip — already in flight");
    return null;
  }
  if (!force && !(await shouldRotate())) return null;

  rotationInFlight = true;
  try {
    const currentIndex = await getSelectedNameIndex();
    const nextIndex = (currentIndex + 1) % ASMA_UL_HUSNA.length;
    const name = ASMA_UL_HUSNA[nextIndex];

    console.log(`[Rotation] ${currentIndex} → ${nextIndex} (${name.transliteration})`);

    const uri = await generateWallpaperImage(name);
    await setDeviceWallpaper(uri);
    await setSelectedNameIndex(nextIndex);
    await setLastRotation(Date.now());

    console.log("[Rotation] ✓ done");
    return name;
  } finally {
    rotationInFlight = false;
  }
}
