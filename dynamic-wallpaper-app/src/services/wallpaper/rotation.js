import * as Notifications from "expo-notifications";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import {
  getSelectedNameIndex,
  setSelectedNameIndex,
  setLastRotation,
  shouldRotate,
} from "../preferences";
import { generateWallpaperImage } from "./generator";
import { setDeviceWallpaper } from "./manager";

// Shared by both the foreground timer (_layout.jsx) and the background task.
// Returns the name object that was rotated to, or null if the interval hasn't elapsed yet.
export async function tryRotateWallpaper() {
  const rotate = await shouldRotate();
  if (!rotate) return null;

  const currentIndex = await getSelectedNameIndex();
  const nextIndex = (currentIndex + 1) % ASMA_UL_HUSNA.length;
  const name = ASMA_UL_HUSNA[nextIndex];

  console.log(`[Rotation] ${currentIndex} → ${nextIndex} (${name.transliteration})`);

  const uri = await generateWallpaperImage(name);
  await setDeviceWallpaper(uri);
  await setSelectedNameIndex(nextIndex);
  await setLastRotation(Date.now());

  console.log(`[Rotation] ✓ done`);
  return name;
}

export async function sendRotationNotification(name) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: name.transliteration,
        body: `${name.name}  •  ${name.translation}`,
        sound: false,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("[Rotation] notification failed:", e.message);
  }
}
