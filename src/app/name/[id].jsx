import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { applyWallpaper } from "../../services/wallpaper/rotation";
import { generateWallpaperImage } from "../../services/wallpaper/generator";
import { Button } from "../../components/ui";
import { WallpaperPreviewImage } from "../../components/WallpaperPreviewImage";
import { useTheme, spacing, radii, type, layout } from "../../theme";

// Name detail — focused on a single Name of Allah. The wallpaper preview is
// the visual hero. Below it: the NEXT name (the one that will rotate in) shown
// as simple text, so the user knows what's coming — without a second preview.
// Primary actions: Set as Wallpaper + Customize appearance.
export default function NameDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);
  const { id } = useLocalSearchParams();

  const name = (() => {
    const num = parseInt(Array.isArray(id) ? id[0] : id, 10);
    return ASMA_UL_HUSNA.find((n) => n.number === num) || ASMA_UL_HUSNA[0];
  })();

  const index = ASMA_UL_HUSNA.findIndex((n) => n.number === name.number);
  const nextName = ASMA_UL_HUSNA[(index + 1) % ASMA_UL_HUSNA.length];
  const [setting, setSetting] = useState(false);
  const [justSet, setJustSet] = useState(false);

  // Reset the "just set" confirmation when navigating to a different name.
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
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: layout.scrollBottomPushed + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallpaper preview — the visual hero (contains the current name) */}
        <View style={s.previewWrap}>
          <WallpaperPreviewImage name={name} style={s.preview} />
          <View style={s.previewBadge}>
            <Text style={s.previewBadgeText}>#{name.number} of 99</Text>
          </View>
        </View>

        {/* Current name summary (compact — the preview already shows it large) */}
        <View style={s.header}>
          <Text style={s.transliteration}>{name.transliteration}</Text>
          <Text style={s.translation}>{name.translation}</Text>
        </View>

        <Text style={s.meaning}>{name.meaning}</Text>

        {/* Next name — simple text, not a preview. Lets the user see what's
            coming without a second image render. */}
        <View style={s.nextBlock}>
          <Text style={s.nextLabel}>NEXT</Text>
          <View style={s.nextRow}>
            <Text style={s.nextArabic} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {nextName.name}
            </Text>
            <View style={s.nextText}>
              <Text style={s.nextTransliteration}>{nextName.transliteration}</Text>
              <Text style={s.nextTranslation} numberOfLines={1}>{nextName.translation}</Text>
            </View>
          </View>
        </View>

        {/* Primary actions */}
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
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing.lg },
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
    transliteration: {
      color: theme.text,
      fontSize: type.title,
      fontWeight: "600",
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
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    // Next name block — a subtle card so it's visually distinct from the
    // current name above it.
    nextBlock: {
      marginTop: spacing.xl,
      backgroundColor: theme.surface,
      borderRadius: radii.lg,
      padding: layout.cardPadding,
    },
    nextLabel: {
      color: theme.textTertiary,
      fontSize: type.micro,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
    },
    nextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    nextArabic: {
      color: theme.text,
      fontFamily: "NotoNaskhArabic",
      fontSize: type.arabicSmall,
      width: 76,
      textAlign: "center",
    },
    nextText: { flex: 1 },
    nextTransliteration: { color: theme.text, fontSize: type.body, fontWeight: "600" },
    nextTranslation: { color: theme.textSecondary, fontSize: type.caption, marginTop: 2 },
    actions: { marginTop: spacing.xxl, gap: spacing.sm },
  });
