import { registerWebModule, NativeModule } from 'expo';

class WallpaperManagerModule extends NativeModule<{}> {}

export default registerWebModule(WallpaperManagerModule, 'WallpaperManagerModule');
