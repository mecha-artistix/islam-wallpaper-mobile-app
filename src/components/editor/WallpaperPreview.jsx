import { StyleSheet, Text, View } from "react-native";
import { Canvas, Rect, LinearGradient, vec } from "@shopify/react-native-skia";
import { buildRenderSpec } from "../../services/wallpaper/renderSpec";
import { resolveFontFile, SYSTEM_FONTS } from "../../services/wallpaper/fonts";

// Live preview for the editor. Reads wallpaperSettings (via buildRenderSpec)
// and maps them to RN/Skia components — it never calls generateWallpaperImage
// and contains no PNG logic. Coordinates scale linearly from the 1080×1920
// render canvas to the on-screen box.
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

function shadowStyle(block, effects, scale) {
  // RN Text supports one shadow. Approximation: glow wins if enabled
  // (same-color halo), otherwise the drop shadow. Outline is not supported
  // by RN Text and is preview-only omitted (it renders in the final PNG).
  if (effects.glow.enabled) {
    return {
      textShadowColor: effects.glow.color,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: effects.glow.strength * scale,
    };
  }
  if (effects.shadow.enabled) {
    return {
      textShadowColor: effects.shadow.color,
      textShadowOffset: { width: effects.shadow.offsetX * scale, height: effects.shadow.offsetY * scale },
      textShadowRadius: effects.shadow.blur * scale,
    };
  }
  return null;
}

function blockText(block, ism) {
  switch (block.key) {
    case "arabic":
      return ism.name;
    case "transliteration":
      return ism.transliteration;
    case "translation":
      return ism.translation;
    case "meaning":
      return ism.meaning;
    default:
      return "";
  }
}

// System fonts take fontWeight directly; registry fonts resolve the weight to
// the nearest file registered by expo-font ("Family-700" etc.), so the style
// must use that name and NOT pass fontWeight (RN would synthesize on top).
function fontStyle(block) {
  if (SYSTEM_FONTS.has(block.fontFamily)) {
    return { fontFamily: block.fontFamily, fontWeight: block.fontWeight || "400" };
  }
  const resolved = resolveFontFile(block.fontFamily, block.fontWeight);
  return { fontFamily: resolved ? resolved.id : block.fontFamily };
}

export default function WallpaperPreview({ ism, settings, width }) {
  const height = (width * CANVAS_HEIGHT) / CANVAS_WIDTH;
  const scale = width / CANVAS_WIDTH;
  const spec = buildRenderSpec(settings);
  const { layout } = spec;

  const { dirX, dirY, startColor, endColor, overlayOpacity } = spec.background.gradient;
  const cx = width / 2;
  const cy = height / 2;
  const halfLen = (width * Math.abs(dirX) + height * Math.abs(dirY)) / 2;

  return (
    <View style={[styles.box, { width, height }]}>
      {spec.background.mode === "solid" ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: spec.background.solid.color }]} />
      ) : (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(cx - dirX * halfLen, cy - dirY * halfLen)}
              end={vec(cx + dirX * halfLen, cy + dirY * halfLen)}
              colors={[startColor, endColor]}
            />
          </Rect>
          {overlayOpacity > 0 && <Rect x={0} y={0} width={width} height={height} color="black" opacity={overlayOpacity} />}
        </Canvas>
      )}

      <View
        style={[
          styles.stack,
          {
            top: layout.topOffsetPct * height,
            left: layout.align === "left" ? layout.safeMargin * scale : (width * (1 - layout.contentWidthPct)) / 2,
            right: layout.align === "right" ? layout.safeMargin * scale : (width * (1 - layout.contentWidthPct)) / 2,
            alignItems: layout.align === "left" ? "flex-start" : layout.align === "right" ? "flex-end" : "center",
          },
        ]}
      >
        {spec.blocks.map((block) => (
          <Text
            key={block.key}
            numberOfLines={block.key === "meaning" ? undefined : 1}
            style={[
              {
                color: block.color,
                opacity: block.opacity,
                fontSize: block.fontSize * scale,
                textAlign: layout.align,
                marginBottom: block.spacingAfter * scale,
              },
              fontStyle(block),
              block.key === "arabic" && {
                letterSpacing: block.letterSpacing * scale,
                lineHeight: block.fontSize * block.lineHeight * scale,
              },
              block.key === "meaning" && {
                maxWidth: layout.contentWidthPct * block.maxWidthPct * width,
                lineHeight: block.lineSpacing * scale,
              },
              shadowStyle(block, spec.effects, scale),
            ]}
          >
            {blockText(block, ism)}
          </Text>
        ))}
      </View>

      {spec.badge.visible && (
        <Text
          style={[
            styles.badge,
            {
              bottom: spec.badge.bottomSpacing * scale,
              color: spec.badge.color,
              opacity: spec.badge.opacity,
              fontSize: spec.badge.fontSize * scale,
            },
            shadowStyle(spec.badge, spec.effects, scale),
          ]}
        >
          {`#${ism.number}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  stack: {
    position: "absolute",
  },
  badge: {
    position: "absolute",
    alignSelf: "center",
  },
});
