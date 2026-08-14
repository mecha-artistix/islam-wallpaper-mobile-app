// The single source of truth for wallpaper appearance.
// generateWallpaperImage (generator.js), WallpaperPreview, and the editor all
// read this shape. Adding a new option = add a property here + one control in
// the editor + read it in the renderer.

export const ARABIC_FONTS = [
  { id: "NotoNaskhArabic", label: "Noto Naskh" },
  { id: "FunPlayArabic", label: "Fun Play" },
];

export const LATIN_FONTS = [
  { id: "sans-serif", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "monospace", label: "Mono" },
];

// matchFont accepts "100".."900" | "normal" | "bold"
export const FONT_WEIGHTS = [
  { id: "300", label: "Light" },
  { id: "400", label: "Regular" },
  { id: "500", label: "Medium" },
  { id: "700", label: "Bold" },
];

export const ALIGNMENTS = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

export const COLOR_SWATCHES = [
  "#FFFFFF",
  "#F5F1E6",
  "#D4AF37",
  "#FF8C00",
  "#7EC8E3",
  "#A8E6CF",
  "#FF6B6B",
  "#CCCCCC",
  "#999999",
  "#666666",
  "#0b3d2e",
  "#16213e",
  "#1a1a2e",
  "#0a0a0a",
  "#000000",
];

export const DEFAULT_WALLPAPER_SETTINGS = {
  background: {
    mode: "gradient", // "gradient" | "solid"  ("image" | "ai" planned)
    gradient: { startColor: "#0a0a0a", endColor: "#16213e", angle: 90, overlayOpacity: 0 },
    solid: { color: "#0a0a0a" },
  },
  arabic: {
    visible: true,
    fontFamily: "NotoNaskhArabic",
    fontSize: 120,
    fontWeight: "400",
    color: "#FFFFFF",
    opacity: 1,
    letterSpacing: 0,
    lineHeight: 1.2,
  },
  transliteration: {
    visible: true,
    fontFamily: "sans-serif",
    fontSize: 52,
    fontWeight: "400",
    color: "#FFFFFF",
    opacity: 1,
  },
  translation: {
    visible: true,
    fontFamily: "sans-serif",
    fontSize: 40,
    fontWeight: "400",
    color: "#CCCCCC",
    opacity: 1,
  },
  meaning: {
    visible: true,
    fontFamily: "sans-serif",
    fontSize: 32,
    fontWeight: "400",
    color: "#999999",
    opacity: 1,
    maxWidthPct: 0.8, // of the layout content width
    lineSpacing: 50, // px between wrapped lines
  },
  numberBadge: {
    visible: true,
    fontSize: 28,
    color: "#FF8C00",
    opacity: 1,
    bottomSpacing: 100, // px from the bottom edge
  },
  layout: {
    topOffsetPct: 0.35, // where the text stack starts, as a fraction of canvas height
    spacingAfterArabic: 60,
    spacingAfterTranslit: 100,
    spacingAfterTranslation: 80,
    contentWidthPct: 0.9,
    align: "center", // "left" | "center" | "right"
    safeMargin: 40, // px, used when align is left/right
  },
  effects: {
    shadow: { enabled: false, blur: 12, offsetX: 0, offsetY: 4, color: "#000000", opacity: 0.6 },
    glow: { enabled: false, strength: 16, color: "#FFFFFF" },
    outline: { enabled: false, thickness: 2, color: "#000000" },
  },
};

// Deep-merge a (possibly partial) saved object over the defaults so old saved
// settings keep working when new properties are added.
export function mergeSettings(partial) {
  if (!partial || typeof partial !== "object") return DEFAULT_WALLPAPER_SETTINGS;
  const out = { ...DEFAULT_WALLPAPER_SETTINGS };
  for (const key of Object.keys(DEFAULT_WALLPAPER_SETTINGS)) {
    const def = DEFAULT_WALLPAPER_SETTINGS[key];
    const val = partial[key];
    if (val && typeof val === "object" && !Array.isArray(val) && def && typeof def === "object") {
      out[key] = { ...def, ...val };
      // One more level for nested groups (gradient, solid, shadow, glow, outline)
      for (const sub of Object.keys(def)) {
        if (def[sub] && typeof def[sub] === "object" && val[sub] && typeof val[sub] === "object") {
          out[key][sub] = { ...def[sub], ...val[sub] };
        }
      }
    } else if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

function preset(overrides) {
  return mergeSettings(overrides);
}

export const BUILT_IN_PRESETS = [
  { name: "Dark Night", settings: DEFAULT_WALLPAPER_SETTINGS },
  {
    name: "Gold",
    settings: preset({
      background: {
        gradient: { startColor: "#0d0a04", endColor: "#241c08" },
      },
      arabic: { color: "#D4AF37" },
      transliteration: { color: "#F5F1E6" },
      translation: { color: "#E6D9B8" },
      numberBadge: { color: "#D4AF37" },
    }),
  },
  {
    name: "Minimal",
    settings: preset({
      background: { mode: "solid", solid: { color: "#000000" } },
      arabic: { fontSize: 110 },
      transliteration: { fontSize: 40 },
      translation: { visible: false },
      meaning: { visible: false },
      numberBadge: { visible: false },
      layout: { topOffsetPct: 0.42 },
    }),
  },
  {
    name: "Classic",
    settings: preset({
      background: {
        gradient: { startColor: "#0b3d2e", endColor: "#071f18" },
      },
      arabic: { color: "#F5F1E6" },
      transliteration: { fontFamily: "serif", color: "#D4AF37" },
      translation: { fontFamily: "serif", color: "#E6D9B8" },
      meaning: { color: "#B8C9BE" },
      numberBadge: { color: "#D4AF37" },
    }),
  },
  {
    name: "Modern",
    settings: preset({
      background: {
        gradient: { startColor: "#0f0c29", endColor: "#302b63" },
      },
      transliteration: { fontSize: 60, fontWeight: "300", color: "#7EC8E3" },
      translation: { color: "#D1D1E0" },
      meaning: { color: "#9a9ab8" },
      numberBadge: { color: "#7EC8E3" },
      layout: { spacingAfterArabic: 80, spacingAfterTranslit: 70 },
    }),
  },
];
