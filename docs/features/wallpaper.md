# Wallpaper (generation + application + appearance)

## Purpose

Generates the wallpaper PNG containing a Name of Allah and applies it to the
device. Also owns the wallpaper *appearance* model (colors, fonts, layout) that
drives generation. This feature is **what gets drawn and set**, not *which name*
or *when* — those are rotation/scheduling.

## Relevant files

- `src/services/wallpaper/generator.js` — `generateWallpaperImage(ism, settings?)`. Skia 1080×1920 surface → PNG in cache. Single source of truth for images.
- `src/services/wallpaper/manager.js` — `setDeviceWallpaper(uri)` bridge to the native module.
- `src/services/wallpaper/settings.js` — `DEFAULT_WALLPAPER_SETTINGS`, `mergeSettings`, `BUILT_IN_PRESETS`, `ARABIC_FONTS`, `COLOR_SWATCHES`, `ALIGNMENTS`.
- `src/services/wallpaper/renderSpec.js` — `buildRenderSpec(settings)` normalizes settings for both the generator and the live preview.
- `src/services/wallpaper/fonts.js` — `FONT_FILES` registry, `resolveFontFile`, `EXPO_FONTS` for `useFonts`.
- `src/services/wallpaper/index.js` — re-exports `generateWallpaperImage` + `setDeviceWallpaper`.
- `modules/wallpaper-manager/android/.../WallpaperManagerModule.kt` — native `setWallpaper(uri, target)` via Android `WallpaperManager`.
- `src/components/WallpaperPreviewImage.jsx` — cached PNG preview using the generator.
- `src/components/editor/WallpaperPreview.jsx` — fast live preview (maps settings → RN/Skia, no PNG).

## Main components / functions

- `generateWallpaperImage(ism, settings?)` → `Promise<fileUri>`. When `settings` omitted, loads saved `wallpaper_settings` (so rotation + detail page always reflect the user's theme).
- `setDeviceWallpaper(uri)` → calls native `setWallpaper(uri, "both")`.
- `mergeSettings(partial)` → deep-merges a saved partial over defaults (old saves survive new properties).
- `buildRenderSpec(settings)` → flat spec consumed by both renderer paths.

## Data flow

```
wallpaperSettings (preferences)
   → buildRenderSpec
   → generator (Skia draw) → PNG in cache
   → manager → native WallpaperManager.setBitmap (home + lock)
```

The live preview (`WallpaperPreview.jsx`) short-circuits the PNG step — it maps
the same render spec to RN/Skia components for instant feedback.

## State / preferences

- `wallpaper_settings` (SecureStore, JSON) — the active appearance object. See `preferences.md`.
- PNGs written to `Paths.cache/wallpaper_<number>.png` (regenerated on demand; safe to clear).

## Dependencies

- `@shopify/react-native-skia` — rendering. Custom fonts registered via a `TypefaceFontProvider`; Arabic uses the Paragraph API (HarfBuzz shaping).
- Android `WallpaperManager` (native module) — `setBitmap` with `FLAG_SYSTEM | FLAG_LOCK`.
- expo-font (custom font files in `assets/fonts/`).

## Important constraints

- The generator is the **single source of truth** — detail screen, editor preview, and background rotation all use it. Don't duplicate rendering logic.
- `WallpaperPreview.jsx` expects props `{ ism, settings, width }` (not `name`); height is derived from width. Don't change this without updating callers.
- The native module requires the app have `SET_WALLPAPER` permission (declared in `app.json`).

## Related features

- **rotation** — calls `generateWallpaperImage` + `applyWallpaper`.
- **scheduling** — background task triggers rotation which triggers this.
- **preferences** — stores `wallpaper_settings`.
- **app-ui / settings-ui** — customize screen writes `wallpaper_settings`; detail/Home read it.

## Known issues / notes

- Live preview approximations: outline not shown (RN Text has no stroke); glow approximated with a same-color text shadow; glow/outline don't apply to the Arabic block (Skia Paragraph supports shadows only). The final PNG is always exact.
- iOS native module is an empty stub — wallpaper setting is Android-only.
