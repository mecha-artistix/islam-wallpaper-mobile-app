import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { applyWallpaper } from "../../services/wallpaper/rotation";
import { generateWallpaperImage } from "../../services/wallpaper/generator";
import { Button } from "../../components/ui";
import { WallpaperPreviewImage } from "../../components/WallpaperPreviewImage";
import { useTheme, spacing, radii, type } from "../../theme";

// Name detail — focused on a single Name of Allah. Shows the large Arabic
// name, transliteration, meaning, the wallpaper preview, and a primary Set
// Wallpaper action. A "Customize" link opens the simple appearance settings
// (not a Figma-like editor).
export default function NameDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = makeStyles(theme);
  const { id } = useLocalSearchParams();

  const name = (() => {
    const num = parseInt(Array.isArray(id) ? id[0] : id, 10);
    return ASMA_UL_HUSNA.find((n) => n.number === num) || ASMA_UL_HUSNA[0];
  })();

  const index = ASMA_UL_HUSNA.findIndex((n) => n.number === name.number);
  const [setting, setSetting] = useState(false);
  const [justSet, setJustSet] = useState(false);

  // Reset the "just set" confirmation when navigating to a different name.
  // (Keying the whole screen on name.number would also work but is heavier;
  // this small reset is the minimal, correct approach.)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJustSet(false);
  }, [name.number]);

  async function handleSetWallpaper() {
    if (setting) return;
    setSetting(true);
    setJustSet(false);
    try {
      const uri = await generateWallpaperImage(name);
      await applyWallpaper({ uri, name, index, source: "manual" });
      setJustSet(true);
      setTimeout(() => setJustSet(false), 3500);
    } catch {
      setJustSet(false);
    } finally {
      setSetting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.previewWrap}>
        <WallpaperPreviewImage name={name} style={s.preview} />
        <View style={s.previewBadge}>
          <Text style={s.previewBadgeText}>#{name.number} of 99</Text>
        </View>
      </View>

      <View style={s.header}>
        <Text style={s.arabic}>{name.name}</Text>
        <Text style={s.transliteration}>{name.transliteration}</Text>
        <Text style={s.translation}>{name.translation}</Text>
      </View>

      <Text style={s.meaning}>{name.meaning}</Text>

      <View style={s.actions}>
        <Button
          label={justSet ? "Wallpaper set" : "Set as Wallpaper"}
          onPress={handleSetWallpaper}
          size="lg"
          loading={setting}
          icon={justSet ? "checkmark" : undefined}
        />
        <Button
          label="Customize appearance"
          onPress={() => router.push({ pathname: "/customize", params: { id: String(name.number) } })}
          variant="ghost"
          size="md"
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 16, paddingTop: spacing.lg },
    previewWrap: { width: "100%", alignSelf: "center", maxWidth: 420 },
    preview: { width: "100%" },
    previewBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    previewBadgeText: {
      color: "#F3EDE0",
      fontSize: type.caption,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    header: { alignItems: "center", marginTop: spacing.xl, paddingHorizontal: spacing.md },
    arabic: {
      color: theme.text,
      fontFamily: "NotoNaskhArabic",
      fontSize: type.arabicHero,
      lineHeight: type.arabicHero * 1.25,
      textAlign: "center",
    },
    transliteration: {
      color: theme.text,
      fontSize: type.title,
      fontWeight: "600",
      marginTop: spacing.sm,
      letterSpacing: 0.2,
    },
    translation: {
      color: theme.textSecondary,
      fontSize: type.body,
      marginTop: 4,
      textAlign: "center",
    },
    meaning: {
      color: theme.textSecondary,
      fontSize: type.body,
      lineHeight: 24,
      textAlign: "center",
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    actions: { marginTop: spacing.xxl, gap: spacing.sm },
  });
