import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import {
  getSelectedNameIndex,
  setSelectedNameIndex,
  setLastRotation,
  shouldRotate,
} from "../preferences";
import { generateWallpaperImage } from "./generator";
import { setDeviceWallpaper } from "./manager";
import { notifyWallpaperChanged } from "../notifications";
import { logEvent } from "../logger";
console.log("rotation.js loaded");
// ALL wallpaper changes — background rotation, manual set, editor set — funnel
// through this file so there is exactly one place to debug and modify.
// Every change is logged with a `source`:
//   "background" — fired by the OS task (schedular/backgroundTask.js)
//   "manual"     — user tapped Set on the detail page or in the editor
//   "test"       — Rotate Now button in settings

let rotationInFlight = false;

// Single change path: sets the image, updates rotation state (index + clock),
// notifies per the user's settings, and logs the outcome with its source.
export async function applyWallpaper({ uri, name, index, source }) {
  // await logEvent("wallpaper", `changing (source=${source}) → ${name.transliteration}`);
  await logEvent("wallpaper", `changing (source=${source}) → ${index}`);
  try {
    await setDeviceWallpaper(uri);
    if (index != null && index !== -1) await setSelectedNameIndex(index);
    // Resetting the rotation clock on manual picks too — otherwise an
    // auto-rotation could fire seconds after the user chose a name
    await setLastRotation(Date.now());
    // Respects the user's notification settings; no-op when disabled
    await notifyWallpaperChanged(name);
    await logEvent("wallpaper", `changed ✓ (source=${source}) ${name.number}`);
  } catch (e) {
    await logEvent("wallpaper", `change FAILED (source=${source}): ${e.message}`);
    throw e;
  }
}

// Automatic path: picks the next name, generates the default image, applies it.
// Returns the name rotated to, or null when skipped (in-flight or interval not
// elapsed). force=true skips the shouldRotate() gate (settings debug button).
export async function rotateWallpaper({ force = false, source = "background" } = {}) {
  if (rotationInFlight) {
    await logEvent("rotation", `skip — already in flight (source=${source})`);
    return null;
  }
  // Set before the first await: queued OS events flushed at app start invoke
  // this concurrently — a flag set after an await lets every one of them through.
  rotationInFlight = true;
  try {
    if (!force && !(await shouldRotate())) {
      await logEvent("rotation", "blocked by shouldRotate");
      return null;
    }
    const currentIndex = await getSelectedNameIndex();
await logEvent("rotation", `currentIndex=${currentIndex}`);

    const nextIndex = (currentIndex + 1) % ASMA_UL_HUSNA.length;
    const name = ASMA_UL_HUSNA[nextIndex];

    await logEvent("rotation", `advancing ${currentIndex} → ${nextIndex} (${name.transliteration}, source=${source})`);

    const uri = await generateWallpaperImage(name);
  await logEvent("rotation", `generated image=${uri}`);

    await applyWallpaper({ uri, name, index: nextIndex, source });
await logEvent("rotation", "apply completed");

    return name;
  } finally {
    rotationInFlight = false;
  }
}

