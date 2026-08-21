import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  getAutoRotate,
  getProfile,
  getRotationIntervalMinutes,
  setAutoRotate,
  setRotationIntervalMinutes,
} from "../../services/preferences";
import { registerWallpaperScheduler } from "../../services/schedular/schedular";
import { useTheme, spacing, type } from "../../theme";
import { Card, Row, SectionLabel, SwitchRow, Segmented } from "../../components/ui";

// Settings hub — grouped into a few simple sections: Profile, Wallpaper,
// Notifications, App. Developer/debug tooling is intentionally absent from the
// normal production UI (the activity log is reachable only via a long-press on
// the About row, kept for diagnostics but invisible to a casual user).
const INTERVAL_PRESETS = [
  { id: "60", label: "1 h" },
  { id: "360", label: "6 h" },
  { id: "1440", label: "Daily" },
  { id: "10080", label: "Weekly" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [profile, setProfileState] = useState({ name: null, email: null });
  const [autoRotate, setAutoRotateState] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);

  const load = useCallback(async () => {
    const [p, auto, interval] = await Promise.all([
      getProfile(),
      getAutoRotate(),
      getRotationIntervalMinutes(),
    ]);
    setProfileState(p);
    setAutoRotateState(auto);
    setIntervalMinutes(interval);
  }, []);

  // initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // refresh on focus (covers returning from profile/notifications/customize)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAutoToggle(value) {
    setAutoRotateState(value);
    await setAutoRotate(value);
    await registerWallpaperScheduler({ force: true });
  }

  async function handleIntervalPreset(id) {
    const minutes = parseFloat(id);
    setIntervalMinutes(minutes);
    await setRotationIntervalMinutes(minutes);
    await registerWallpaperScheduler({ force: true });
  }

  function handleAboutLongPress() {
    // Hidden entry to the activity log — for diagnostics only. A casual user
    // never sees this; a long-press is intentional.
    router.push("/logs");
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Settings</Text>

        {/* ── Profile ── */}
        <SectionLabel>Profile</SectionLabel>
        <Card>
          <Row
            title={profile.name || "Add your name"}
            subtitle={profile.email || "No email"}
            showChevron
            onPress={() => router.push("/profile")}
          />
        </Card>

        {/* ── Wallpaper ── */}
        <SectionLabel>Wallpaper</SectionLabel>
        <Card>
          <SwitchRow
            title="Automatic rotation"
            subtitle="Quietly change your wallpaper on a schedule"
            value={autoRotate}
            onValueChange={handleAutoToggle}
          />
          <Divider theme={theme} />
          {autoRotate ? (
            <View style={s.intervalBlock}>
              <Text style={s.intervalLabel}>Changes every</Text>
              <Segmented
                options={INTERVAL_PRESETS}
                value={String(intervalMinutes)}
                onChange={handleIntervalPreset}
              />
            </View>
          ) : null}
        </Card>
        <Card style={s.linkCard}>
          <Row
            title="Wallpaper appearance"
            subtitle="Font, size, color, position, style"
            showChevron
            onPress={() => router.push("/customize")}
          />
        </Card>

        {/* ── Notifications ── */}
        <SectionLabel>Notifications</SectionLabel>
        <Card>
          <Row
            title="Notifications"
            subtitle="Wallpaper change alerts"
            showChevron
            onPress={() => router.push("/notifications")}
          />
        </Card>

        {/* ── App ── */}
        <SectionLabel>App</SectionLabel>
        <Card>
          <Pressable onLongPress={handleAboutLongPress} delayLongPress={600}>
            <Row title="About" subtitle="About this app" showChevron onPress={() => router.push("/about")} />
          </Pressable>
          <Divider theme={theme} />
          <Row title="Version" trailing={<Text style={s.versionText}>1.0.0</Text>} />
        </Card>

        <Text style={s.footer}>Set it once, and let the app quietly bring a new Name of Allah to your screen.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// A hairline divider used between rows inside a Card.
function Divider({ theme }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginLeft: spacing.lg }} />;
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 16 },
    title: {
      color: theme.text,
      fontSize: type.display,
      fontWeight: "600",
      letterSpacing: -0.3,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    linkCard: { marginTop: spacing.sm },
    intervalBlock: { paddingTop: spacing.md, paddingBottom: spacing.sm },
    intervalLabel: {
      color: theme.textSecondary,
      fontSize: type.caption,
      fontWeight: "600",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    versionText: { color: theme.textSecondary, fontSize: type.body },
    footer: {
      color: theme.textTertiary,
      fontSize: type.caption,
      textAlign: "center",
      marginTop: spacing.xxl,
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
