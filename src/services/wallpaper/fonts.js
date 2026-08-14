// Central font registry. To add a font:
//   1. Drop the .ttf/.otf file(s) into assets/fonts/
//   2. Add one entry here — the key becomes the fontFamily id everywhere
//   3. Add a matching { id, label } to ARABIC_FONTS or LATIN_FONTS in
//      settings.js so it shows up as an option in the editor
// Value shapes:
//   single file:      Family: require(".../Font-Regular.ttf")
//   weight variants:  Family: { "300": require(".../Light.otf"), "400": ..., "700": ... }
// Both Skia and expo-font need one file per weight — Android can fake-bold
// preview text, but the generated PNG cannot. Weight variants are registered
// as "Family-300" etc.; resolveFontFile picks the exact weight or falls back
// to the nearest available one.
export const FONT_FILES = {
  NotoNaskhArabic: require("../../../assets/fonts/NotoNaskhArabic-Regular.ttf"),
  FunPlayArabic: {
    "300": require("../../../assets/fonts/FunPlayArabic_DEMO-Light.otf"),
    "400": require("../../../assets/fonts/FunPlayArabic_DEMO-Regular.otf"),
    "700": require("../../../assets/fonts/FunPlayArabic_DEMO-Bold.otf"),
  },
};

// Android system families handled by matchFont — no file needed.
export const SYSTEM_FONTS = new Set(["sans-serif", "serif", "monospace"]);

function isWeightMap(entry) {
  return typeof entry === "object" && entry !== null;
}

// expo-font needs a flat name -> file map.
function flatFontFiles() {
  const out = {};
  for (const [family, entry] of Object.entries(FONT_FILES)) {
    if (isWeightMap(entry)) {
      for (const [weight, mod] of Object.entries(entry)) out[`${family}-${weight}`] = mod;
    } else {
      out[family] = entry;
    }
  }
  return out;
}

// Pass straight to useFonts().
export const EXPO_FONTS = flatFontFiles();

// Picks the file for (family, weight): exact weight if present, else the
// nearest available one. Returns { id, module } — id is the registered name.
export function resolveFontFile(family, weight = "400") {
  const entry = FONT_FILES[family];
  if (!entry) return null;
  if (!isWeightMap(entry)) return { id: family, module: entry };
  const weights = Object.keys(entry);
  const target = parseInt(weight, 10) || 400;
  const nearest = weights.reduce((a, b) => (Math.abs(parseInt(b, 10) - target) < Math.abs(parseInt(a, 10) - target) ? b : a));
  return { id: `${family}-${nearest}`, module: entry[nearest] };
}
