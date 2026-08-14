package expo.modules.wallpapermanager

import android.app.WallpaperManager
import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class WallpaperManagerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WallpaperManager")

    AsyncFunction("setWallpaper") { uri: String, target: String ->
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")
      val wallpaperManager = WallpaperManager.getInstance(context)

      val filePath = Uri.parse(uri).path ?: uri.removePrefix("file://")
      val file = File(filePath)
      if (!file.exists()) {
        throw Exception("File not found at path: $filePath")
      }

      val bitmap = BitmapFactory.decodeFile(file.absolutePath)
        ?: throw Exception("Failed to decode image at path: $filePath")

      val flags = when (target) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "lock" -> WallpaperManager.FLAG_LOCK
        "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        else -> throw Exception("Invalid target '$target'. Use 'home', 'lock', or 'both'.")
      }

      wallpaperManager.setBitmap(bitmap, null, true, flags)
      bitmap.recycle()
      true
    }
  }
}
