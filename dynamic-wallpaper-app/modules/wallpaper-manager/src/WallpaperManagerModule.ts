import { NativeModule, requireNativeModule } from 'expo';
import { WallpaperTarget } from './WallpaperManager.types';

declare class WallpaperManagerModule extends NativeModule<{}> {
  setWallpaper(uri: string, target: WallpaperTarget): Promise<boolean>;
}

export default requireNativeModule<WallpaperManagerModule>('WallpaperManager');
