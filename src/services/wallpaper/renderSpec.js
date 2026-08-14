// Normalizes wallpaperSettings into a flat render spec consumed by both
// generator.js (Skia, final PNG) and WallpaperPreview.jsx (live preview).
// No drawing happens here — this is the single place that interprets settings.

// Text blocks render as one vertical stack in this order.
// spacingAfter maps each block to its layout spacing property.
const BLOCK_ORDER = [
  { key: "arabic", spacingKey: "spacingAfterArabic" },
  { key: "transliteration", spacingKey: "spacingAfterTranslit" },
  { key: "translation", spacingKey: "spacingAfterTranslation" },
  { key: "meaning", spacingKey: null },
];

export function buildRenderSpec(settings) {
  const { background, layout, effects, numberBadge } = settings;

  // Gradient direction: angle 0 = left→right, 90 = top→bottom (screen coords, y down)
  const rad = (background.gradient.angle * Math.PI) / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);

  const blocks = BLOCK_ORDER.map(({ key, spacingKey }) => ({
    key,
    ...settings[key],
    spacingAfter: spacingKey ? layout[spacingKey] : 0,
  })).filter((block) => block.visible !== false);

  return {
    background: {
      mode: background.mode,
      gradient: { ...background.gradient, dirX, dirY },
      solid: background.solid,
    },
    blocks,
    badge: numberBadge,
    layout,
    effects,
  };
}
