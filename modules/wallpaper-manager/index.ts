import WallpaperManagerModule from './src/WallpaperManagerModule';
import { WallpaperTarget } from './src/WallpaperManager.types';

export type { WallpaperTarget };

export async function setWallpaper(
  localUri: string,
  target: WallpaperTarget = 'both'
): Promise<boolean> {
  return await WallpaperManagerModule.setWallpaper(localUri, target);
}
