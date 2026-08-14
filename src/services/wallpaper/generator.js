import { Skia, TileMode, matchFont, TextDirection, TextAlign, PaintStyle, StrokeJoin, BlurStyle } from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import { Image } from "react-native";
import { getWallpaperSettings } from "../preferences";
import { mergeSettings } from "./settings";
import { buildRenderSpec } from "./renderSpec";
import { EXPO_FONTS, resolveFontFile, SYSTEM_FONTS } from "./fonts";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

let fontProvider = null;
const typefaceCache = new Map();

async function getTypeface(id, module) {
  if (!typefaceCache.has(id)) {
    const uri = Image.resolveAssetSource(module).uri;
    const data = await Skia.Data.fromURI(uri);
    typefaceCache.set(id, Skia.Typeface.MakeFreeTypeFaceFromData(data));
  }
  return typefaceCache.get(id);
}

// Paragraph rendering needs every custom family registered in one provider.
async function getFontProvider() {
  if (fontProvider) return fontProvider;
  fontProvider = Skia.TypefaceFontProvider.Make();
  for (const [id, module] of Object.entries(EXPO_FONTS)) {
    fontProvider.registerFont(await getTypeface(id, module), id);
  }
  return fontProvider;
}

// Latin blocks: system families go through matchFont (weights supported);
// registry fonts resolve the weight to a file (nearest available wins).
async function makeFont(block) {
  if (SYSTEM_FONTS.has(block.fontFamily)) {
    return matchFont({
      fontFamily: block.fontFamily,
      fontSize: block.fontSize,
      fontWeight: block.fontWeight || "400",
    });
  }
  const resolved = resolveFontFile(block.fontFamily, block.fontWeight);
  if (!resolved) {
    return matchFont({ fontFamily: "sans-serif", fontSize: block.fontSize, fontWeight: block.fontWeight || "400" });
  }
  return Skia.Font(await getTypeface(resolved.id, resolved.module), block.fontSize);
}

// SkColor with opacity applied. In react-native-skia 2.x SkColor is a
// Float32Array [r,g,b,a] — NOT an int — so alpha is set as the 4th channel.
function withOpacity(hex, opacity) {
  const out = new Float32Array(Skia.Color(hex));
  out[3] = Math.max(0, Math.min(1, opacity));
  return out;
}

function makeFillPaint(hex, opacity, effects) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(hex));
  paint.setAlphaf(Math.max(0, Math.min(1, opacity)));
  paint.setAntiAlias(true);
  if (effects.shadow.enabled) {
    paint.setImageFilter(
      Skia.ImageFilter.MakeDropShadow(
        effects.shadow.offsetX,
        effects.shadow.offsetY,
        effects.shadow.blur / 2,
        effects.shadow.blur / 2,
        withOpacity(effects.shadow.color, effects.shadow.opacity)
      )
    );
  }
  return paint;
}

// Under-draw passes for outline and glow, then the fill on top.
// draw(x) performs one text draw with the given paint.
function drawWithEffects(draw, fillPaint, effects) {
  if (effects.outline.enabled) {
    const stroke = Skia.Paint();
    stroke.setColor(Skia.Color(effects.outline.color));
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeWidth(effects.outline.thickness * 2);
    stroke.setStrokeJoin(StrokeJoin.Round);
    draw(stroke);
  }
  if (effects.glow.enabled) {
    const glow = Skia.Paint();
    glow.setColor(Skia.Color(effects.glow.color));
    glow.setAntiAlias(true);
    glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, effects.glow.strength, true));
    draw(glow);
  }
  draw(fillPaint);
}

function textX(font, text, align, contentLeft, contentWidth) {
  const { width } = font.measureText(text);
  if (align === "left") return contentLeft;
  if (align === "right") return contentLeft + contentWidth - width;
  return contentLeft + (contentWidth - width) / 2;
}

function drawLatinLine(canvas, text, font, block, y, spec, contentLeft, width) {
  const x = textX(font, text, spec.layout.align, contentLeft, width);
  const fill = makeFillPaint(block.color, block.opacity, spec.effects);
  drawWithEffects((paint) => canvas.drawText(text, x, y, paint, font), fill, spec.effects);
}

// Word-wraps a block and draws each line; returns the y of the last line.
function drawWrappedBlock(canvas, text, font, block, spec, contentLeft, maxWidth, startY) {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (font.measureText(testLine).width > maxWidth && line) {
      drawLatinLine(canvas, line, font, block, y, spec, contentLeft, maxWidth);
      line = word;
      y += block.lineSpacing;
    } else {
      line = testLine;
    }
  }
  if (line) drawLatinLine(canvas, line, font, block, y, spec, contentLeft, maxWidth);
  return y;
}

const PARAGRAPH_ALIGN = { left: TextAlign.Left, center: TextAlign.Center, right: TextAlign.Right };

// settings is the wallpaperSettings object (see settings.js). When omitted,
// the saved settings are loaded — background rotation and the detail page
// rely on this so they always render the user's current theme.
export async function generateWallpaperImage(ism, settings) {
  const merged = settings || mergeSettings(await getWallpaperSettings());
  const spec = buildRenderSpec(merged);
  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;

  const surface = Skia.Surface.Make(width, height);
  if (!surface) throw new Error("Failed to create Skia surface");
  const canvas = surface.getCanvas();

  // ---- Background ----
  if (spec.background.mode === "solid") {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(spec.background.solid.color));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  } else {
    const { startColor, endColor, dirX, dirY, overlayOpacity } = spec.background.gradient;
    // Project the gradient axis far enough to cover the canvas at any angle
    const cx = width / 2;
    const cy = height / 2;
    const halfLen = (width * Math.abs(dirX) + height * Math.abs(dirY)) / 2;
    const paint = Skia.Paint();
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: cx - dirX * halfLen, y: cy - dirY * halfLen },
        { x: cx + dirX * halfLen, y: cy + dirY * halfLen },
        [Skia.Color(startColor), Skia.Color(endColor)],
        [0, 1],
        TileMode.Clamp
      )
    );
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
    if (overlayOpacity > 0) {
      const overlay = Skia.Paint();
      overlay.setColor(withOpacity("#000000", overlayOpacity));
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), overlay);
    }
  }

  // ---- Text stack ----
  const { layout } = spec;
  const contentWidth = width * layout.contentWidthPct;
  const contentLeft =
    layout.align === "left"
      ? layout.safeMargin
      : layout.align === "right"
        ? width - layout.safeMargin - contentWidth
        : (width - contentWidth) / 2;

  let y = height * layout.topOffsetPct;

  for (const block of spec.blocks) {
    if (block.key === "arabic") {
      // Paragraph API: HarfBuzz shaping so Arabic letters join correctly.
      // Shadow maps to TextStyle.shadows; glow/outline are not supported by
      // the paragraph renderer and are skipped for this block.
      const provider = await getFontProvider();
      const arabicFont = resolveFontFile(block.fontFamily, block.fontWeight);
      const textStyle = {
        fontFamilies: [arabicFont ? arabicFont.id : block.fontFamily],
        fontSize: block.fontSize,
        color: withOpacity(block.color, block.opacity),
        letterSpacing: block.letterSpacing,
        heightMultiplier: block.lineHeight,
      };
      if (spec.effects.shadow.enabled) {
        textStyle.shadows = [
          {
            color: withOpacity(spec.effects.shadow.color, spec.effects.shadow.opacity),
            offset: { x: spec.effects.shadow.offsetX, y: spec.effects.shadow.offsetY },
            blurRadius: spec.effects.shadow.blur,
          },
        ];
      }
      const para = Skia.ParagraphBuilder.Make(
        { textAlign: PARAGRAPH_ALIGN[layout.align], textDirection: TextDirection.RTL },
        provider
      )
        .pushStyle(textStyle)
        .addText(ism.name)
        .pop()
        .build();
      para.layout(contentWidth);
      para.paint(canvas, contentLeft, y);
      y += para.getHeight() + block.spacingAfter;
    } else {
      const font = await makeFont(block);
      if (block.key === "meaning") {
        const maxWidth = contentWidth * block.maxWidthPct;
        const blockLeft =
          layout.align === "right" ? contentLeft + (contentWidth - maxWidth) : layout.align === "center" ? contentLeft + (contentWidth - maxWidth) / 2 : contentLeft;
        y = drawWrappedBlock(canvas, ism.meaning, font, block, spec, blockLeft, maxWidth, y + font.getSize());
      } else {
        const text = block.key === "transliteration" ? ism.transliteration : ism.translation;
        y += font.getSize(); // baseline for the first line
        drawLatinLine(canvas, text, font, block, y, spec, contentLeft, contentWidth);
      }
      y += block.spacingAfter;
    }
  }

  // ---- Number badge (always horizontally centered) ----
  if (spec.badge.visible) {
    const font = matchFont({ fontFamily: "sans-serif", fontSize: spec.badge.fontSize });
    const text = `#${ism.number}`;
    const { width: textWidth } = font.measureText(text);
    const fill = makeFillPaint(spec.badge.color, spec.badge.opacity, spec.effects);
    drawWithEffects(
      (paint) => canvas.drawText(text, (width - textWidth) / 2, height - spec.badge.bottomSpacing, paint, font),
      fill,
      spec.effects
    );
  }

  const image = surface.makeImageSnapshot();
  if (!image) throw new Error("Failed to create image snapshot");
  const data = image.encodeToBytes();
  if (!data) throw new Error("Failed to encode image");

  const file = new File(Paths.cache, `wallpaper_${ism.number}.png`);
  if (file.exists) file.delete();
  file.write(data);

  return file.uri;
}
