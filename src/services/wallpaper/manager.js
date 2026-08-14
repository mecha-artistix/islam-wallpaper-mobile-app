import { setWallpaper } from "../../../modules/wallpaper-manager";

export async function setDeviceWallpaper(uri) {
  await setWallpaper(uri, "both");
}
