import { Skia, TileMode, matchFont, TextDirection, TextAlign } from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import { Image } from "react-native";

const ARABIC_FONT_MODULE = require("../../../assets/fonts/NotoNaskhArabic-Regular.ttf");

let arabicFontProvider = null;

async function getArabicFontProvider() {
  if (arabicFontProvider) return arabicFontProvider;
  const uri = Image.resolveAssetSource(ARABIC_FONT_MODULE).uri;
  const data = await Skia.Data.fromURI(uri);
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  arabicFontProvider = Skia.TypefaceFontProvider.Make();
  arabicFontProvider.registerFont(typeface, "NotoNaskhArabic");
  return arabicFontProvider;
}

function drawCenteredText(canvas, text, font, paint, canvasWidth, y) {
  const { width } = font.measureText(text);
  const x = (canvasWidth - width) / 2;
  canvas.drawText(text, x, y, paint, font);
}

function drawWrappedText(canvas, text, font, paint, canvasWidth, startY, maxWidth, lineSpacing) {
  const words = text.split(" ");
  let line = "";
  let y = startY;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = font.measureText(testLine);
    if (width > maxWidth && line) {
      drawCenteredText(canvas, line, font, paint, canvasWidth, y);
      line = word;
      y += lineSpacing;
    } else {
      line = testLine;
    }
  }
  if (line) {
    drawCenteredText(canvas, line, font, paint, canvasWidth, y);
  }
  return y;
}

export async function generateWallpaperImage(ism) {
  const width = 1080;
  const height = 1920;

  const surface = Skia.Surface.Make(width, height);
  if (!surface) throw new Error("Failed to create Skia surface");

  const canvas = surface.getCanvas();

  // Background gradient
  const bgPaint = Skia.Paint();
  bgPaint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: 0, y: height },
      [Skia.Color("#0a0a0a"), Skia.Color("#1a1a2e"), Skia.Color("#16213e")],
      [0, 0.5, 1],
      TileMode.Clamp
    )
  );
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), bgPaint);

  const white = Skia.Paint();
  white.setColor(Skia.Color("#FFFFFF"));
  white.setAntiAlias(true);

  const lightGray = Skia.Paint();
  lightGray.setColor(Skia.Color("#CCCCCC"));
  lightGray.setAntiAlias(true);

  const dimGray = Skia.Paint();
  dimGray.setColor(Skia.Color("#999999"));
  dimGray.setAntiAlias(true);

  const orange = Skia.Paint();
  orange.setColor(Skia.Color("#FF8C00"));
  orange.setAntiAlias(true);

  // Arabic name — Paragraph API uses HarfBuzz shaping so letters join correctly
  const fontProvider = await getArabicFontProvider();
  const arabicPara = Skia.ParagraphBuilder.Make(
    { textAlign: TextAlign.Center, textDirection: TextDirection.RTL },
    fontProvider
  )
    .pushStyle({ fontFamilies: ["NotoNaskhArabic"], fontSize: 120, color: Skia.Color("#FFFFFF") })
    .addText(ism.name)
    .pop()
    .build();

  arabicPara.layout(width);
  const arabicY = height * 0.35;
  arabicPara.paint(canvas, 0, arabicY);

  // Latin fields — position relative to where Arabic paragraph ends
  const translitY = arabicY + arabicPara.getHeight() + 60;
  const translitFont = matchFont({ fontFamily: "sans-serif", fontSize: 52 });
  drawCenteredText(canvas, ism.transliteration, translitFont, white, width, translitY);

  const transFont = matchFont({ fontFamily: "sans-serif", fontSize: 40 });
  const transY = translitY + 100;
  drawCenteredText(canvas, ism.translation, transFont, lightGray, width, transY);

  const meaningFont = matchFont({ fontFamily: "sans-serif", fontSize: 32 });
  drawWrappedText(canvas, ism.meaning, meaningFont, dimGray, width, transY + 80, width * 0.8, 50);

  const numberFont = matchFont({ fontFamily: "sans-serif", fontSize: 28 });
  drawCenteredText(canvas, `#${ism.number}`, numberFont, orange, width, height - 100);

  const image = surface.makeImageSnapshot();
  if (!image) throw new Error("Failed to create image snapshot");

  const data = image.encodeToBytes();
  if (!data) throw new Error("Failed to encode image");

  const file = new File(Paths.cache, `wallpaper_${ism.number}.png`);
  if (file.exists) file.delete();
  file.write(data);

  return file.uri;
}
