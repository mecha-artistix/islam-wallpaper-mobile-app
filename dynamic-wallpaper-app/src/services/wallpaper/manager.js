import { setWallpaper } from "../../../modules/wallpaper-manager";
import { File } from "expo-file-system";

export async function setDeviceWallpaper(uri) {
  const file = new File(uri);

  console.log("Wallpaper exists:", file.exists);
  console.log("Wallpaper size:", file.size);

  await setWallpaper(uri, "both");
}