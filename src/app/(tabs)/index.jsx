import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import {
  getAutoRotate,
  getLastRotation,
  getOnboardingCompleted,
  getRotationIntervalMinutes,
  getSelectedNameIndex,
} from "../../services/preferences";
import { applyWallpaper } from "../../services/wallpaper/rotation";
import { generateWallpaperImage } from "../../services/wallpaper/generator";
import { registerWallpaperScheduler } from "../../services/schedular/schedular";
import { Button, Pill } from "../../components/ui";
import { WallpaperPreviewImage } from "../../components/WallpaperPreviewImage";
import { useTheme, spacing, radii, type, layout } from "../../theme";

// Home — the calm visual anchor. The current wallpaper preview dominates the
// screen. Below it: the Arabic name, transliteration, meaning, and a clear
// primary "Set Wallpaper" action plus a way to move to the next name. A small
// status pill shows automatic-rotation state without technical jargon.
//
// This screen also hosts the onboarding gate: on first launch it redirects to
// /onboarding while the splash is still covering, so there's no visible flicker.
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const [ready, setReady] = useState(false);
  const [name, setName] = useState(ASMA_UL_HUSNA[0]);
  const [index, setIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [lastRotation, setLastRotation] = useState(null);
  const [setting, setSetting] = useState(false);
  const [justSet, setJustSet] = useState(false);

  async function loadState() {
    const [idx, auto, interval, last] = await Promise.all([
      getSelectedNameIndex(),
      getAutoRotate(),
      getRotationIntervalMinutes(),
      getLastRotation(),
    ]);
    const safeIdx = Math.min(Math.max(0, idx), ASMA_UL_HUSNA.length - 1);
    setIndex(safeIdx);
    setName(ASMA_UL_HUSNA[safeIdx]);
    setAutoRotate(auto);
    setIntervalMinutes(interval);
    setLastRotation(last);
  }

  // One-time: onboarding gate + initial load.
  useEffect(() => {
    (async () => {
      const done = await getOnboardingCompleted();
      if (!done) {
        router.replace("/onboarding");
        return; // keep splash up; onboarding hides it
      }
      SplashScreen.hideAsync();
      // Ensure the scheduler is registered (also done in onboarding, but this
      // covers users who upgrade from a pre-onboarding build). Awaited so the
      // task is definitely registered before the user backgrounds the app.
      await registerWallpaperScheduler();
      await loadState();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh rotation state whenever the tab is focused (covers returning from
  // settings where the user may have toggled auto-rotate).
  useFocusEffect(
    useCallback(() => {
      if (ready) loadState();
    }, [ready])
  );

  async function handleSetWallpaper() {
    if (setting) return;
    setSetting(true);
    setJustSet(false);
    try {
      // Regenerate fresh (in case settings changed) then apply.
      const uri = await generateWallpaperImage(name);
      await applyWallpaper({ uri, name, index, source: "manual" });
      setJustSet(true);
      // auto-hide the success state after a moment
      setTimeout(() => setJustSet(false), 3500);
    } catch (_e) {
      // surface as a pill on the button area, non-blocking
      setJustSet(false);
    } finally {
      setSetting(false);
    }
  }

  function handleNextName() {
    const nextIdx = (index + 1) % ASMA_UL_HUSNA.length;
    setIndex(nextIdx);
    setName(ASMA_UL_HUSNA[nextIdx]);
    setJustSet(false);
  }

  function handleOpenName() {
    router.push({ pathname: "/name/[id]", params: { id: String(name.number) } });
  }

  if (!ready) {
    return <View style={s.container} />;
  }

  const nextChangeLabel = formatNextChange(autoRotate, intervalMinutes, lastRotation);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: layout.scrollBottomTab + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerRow}>
          <Text style={s.greeting}>Asma ul Husna</Text>
          {autoRotate ? (
            <Pill tone="gold">Auto · {humanInterval(intervalMinutes)}</Pill>
          ) : (
            <Pill tone="muted">Manual</Pill>
          )}
        </View>

        {/* Wallpaper preview — the visual hero */}
        <Pressable onPress={handleOpenName} style={s.previewWrap}>
          <WallpaperPreviewImage name={name} style={s.preview} />
          <View style={s.previewBadge}>
            <Text style={s.previewBadgeText}>#{name.number}</Text>
          </View>
        </Pressable>

        {/* Name details */}
        <Pressable onPress={handleOpenName} style={s.nameBlock}>
          <Text style={s.arabic}>{name.name}</Text>
          <Text style={s.transliteration}>{name.transliteration}</Text>
          <Text style={s.translation}>{name.translation}</Text>
        </Pressable>

        {/* Primary actions */}
        <View style={s.actions}>
          <Button
            label={justSet ? "Wallpaper set" : "Set Wallpaper"}
            onPress={handleSetWallpaper}
            size="lg"
            loading={setting}
            icon={justSet ? "checkmark" : undefined}
            style={s.primaryAction}
          />
          <Button label="Next Name" onPress={handleNextName} variant="soft" size="lg" icon="arrow-forward" />
        </View>

        {/* Rotation status — unobtrusive */}
        <View style={s.statusRow}>
          <Text style={s.statusLabel}>Automatic rotation</Text>
          <Text style={s.statusValue}>
            {autoRotate ? `On · ${nextChangeLabel}` : "Off"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── formatting helpers (human-readable, no technical jargon) ───────────────────
function humanInterval(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = hours / 24;
  if (days === 1) return "daily";
  return `${Math.round(days * 10) / 10} d`;
}

function formatNextChange(autoRotate, intervalMinutes, lastRotation) {
  if (!autoRotate || !lastRotation) return "—";
  const next = lastRotation + intervalMinutes * 60 * 1000;
  const diff = next - Date.now();
  if (diff <= 0) return "soon";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: layout.screenPaddingH },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: layout.sectionGap,
      marginBottom: spacing.lg,
    },
    greeting: {
      color: theme.text,
      fontSize: type.subtitle,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
    previewWrap: { width: "100%", alignSelf: "center", maxWidth: 420 },
    preview: { width: "100%" },
    previewBadge: {
      position: "absolute",
      top: 12,
      right: 12,
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
    nameBlock: { alignItems: "center", marginTop: spacing.xl, paddingHorizontal: spacing.md },
    arabic: {
      color: theme.text,
      fontFamily: "NotoNaskhArabic",
      fontSize: type.arabicHero,
      lineHeight: type.arabicHero * 1.25,
      textAlign: "center",
    },
    transliteration: {
      color: theme.text,
      fontSize: type.subtitle,
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
    actions: { marginTop: spacing.xxl, gap: spacing.sm },
    primaryAction: { marginBottom: 0 },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.divider,
    },
    statusLabel: { color: theme.textSecondary, fontSize: type.caption },
    statusValue: { color: theme.text, fontSize: type.caption, fontWeight: "600" },
  });
