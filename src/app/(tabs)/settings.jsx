import { useCallback, useEffect, useState } from "react";
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  getAutoRotate,
  getLastRotation,
  getProfile,
  getRotationIntervalMinutes,
  getSelectedNameIndex,
  setAutoRotate,
  setRotationIntervalMinutes,
} from "../../services/preferences";
import { registerWallpaperScheduler } from "../../services/schedular/schedular";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { useTheme, spacing, type, layout } from "../../theme";
import { Card, Row, SectionLabel, SwitchRow, Segmented, Button } from "../../components/ui";

// Settings hub — grouped into a few simple sections: Profile, Wallpaper,
// Notifications, App. Developer/debug tooling is intentionally absent from the
// normal production UI (the activity log is reachable only via a long-press on
// the About row, kept for diagnostics but invisible to a casual user).
// Fixed preset intervals (kept) + a custom text input (restored). The user's
// configured value is stored verbatim (min 1 minute); the OS scheduler may fire
// on its own minimum cadence, but shouldRotate() honors the user's value.
// See docs/features/rotation.md + docs/decisions/003-user-interval-vs-os-scheduler-minimum.md.
const INTERVAL_PRESETS = [
  { id: "60", label: "1 h" },
  { id: "360", label: "6 h" },
  { id: "1440", label: "Daily" },
  { id: "10080", label: "Weekly" },
];
const MIN_USER_INTERVAL_MINUTES = 1;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const [profile, setProfileState] = useState({ name: null, email: null });
  const [autoRotate, setAutoRotateState] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [customInterval, setCustomInterval] = useState(""); // text for the custom input
  const [intervalError, setIntervalError] = useState("");
  // Current-state section
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastRotation, setLastRotationState] = useState(null);

  const load = useCallback(async () => {
    const [p, auto, interval, idx, last] = await Promise.all([
      getProfile(),
      getAutoRotate(),
      getRotationIntervalMinutes(),
      getSelectedNameIndex(),
      getLastRotation(),
    ]);
    setProfileState(p);
    setAutoRotateState(auto);
    setIntervalMinutes(interval);
    setSelectedIndex(idx);
    setLastRotationState(last);
    // Mirror the stored value into the custom input only when it's not a preset
    // (so the field shows the actual configured value, e.g. "1" or "90").
    if (!INTERVAL_PRESETS.some((pr) => parseFloat(pr.id) === interval)) {
      setCustomInterval(String(interval));
    } else {
      setCustomInterval("");
    }
    setIntervalError("");
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
    setCustomInterval(""); // a preset was chosen; clear the custom field
    setIntervalError("");
    await setRotationIntervalMinutes(minutes);
    await registerWallpaperScheduler({ force: true });
  }

  async function handleCustomIntervalSave() {
    const trimmed = customInterval.trim();
    const minutes = parseFloat(trimmed);
    if (!trimmed || isNaN(minutes)) {
      setIntervalError("Enter a number of minutes.");
      return;
    }
    if (minutes < MIN_USER_INTERVAL_MINUTES) {
      setIntervalError(`Minimum is ${MIN_USER_INTERVAL_MINUTES} minute.`);
      return;
    }
    // Reject absurdly large values defensively (cap at 1 year). The user value
    // is stored verbatim — no silent 15-min bump (see decision 003).
    if (minutes > 525600) {
      setIntervalError("Interval is too large.");
      return;
    }
    Keyboard.dismiss();
    setIntervalMinutes(minutes);
    setIntervalError("");
    await setRotationIntervalMinutes(minutes);
    await registerWallpaperScheduler({ force: true });
    // Explicit success feedback — the user must know the save happened.
    Alert.alert("Saved", `Rotation interval set to ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }

  function handleAboutLongPress() {
    // Hidden entry to the activity log — for diagnostics only. A casual user
    // never sees this; a long-press is intentional.
    router.push("/logs");
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: layout.scrollBottomTab + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Settings</Text>

        {/* ── Current state (at-a-glance) ── */}
        <SectionLabel>Current</SectionLabel>
        <Card>
          <Row
            title="Current name"
            trailing={
              <Text style={s.stateValue}>
                {ASMA_UL_HUSNA[selectedIndex]?.transliteration} · #{ASMA_UL_HUSNA[selectedIndex]?.number}
              </Text>
            }
          />
          <Divider theme={theme} />
          <Row
            title="Next name"
            trailing={
              <Text style={s.stateValue}>
                {ASMA_UL_HUSNA[(selectedIndex + 1) % ASMA_UL_HUSNA.length]?.transliteration} · #{ASMA_UL_HUSNA[(selectedIndex + 1) % ASMA_UL_HUSNA.length]?.number}
              </Text>
            }
          />
          <Divider theme={theme} />
          <Row
            title="Interval"
            trailing={<Text style={s.stateValue}>{humanInterval(intervalMinutes)}</Text>}
          />
          <Divider theme={theme} />
          <Row
            title="Last rotation"
            trailing={<Text style={s.stateValue}>{formatLastRotation(lastRotation)}</Text>}
          />
          <Divider theme={theme} />
          <Row
            title="Auto-rotate"
            trailing={<Text style={s.stateValue}>{autoRotate ? "On" : "Off"}</Text>}
          />
        </Card>

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
              {/* Custom interval (restored). The user can enter any value down
                  to 1 minute. Stored verbatim — the OS scheduler may fire on
                  its own minimum cadence, but shouldRotate() honors this. */}
              <Text style={[s.intervalLabel, { marginTop: spacing.md }]}>Custom (minutes)</Text>
              <View style={s.customRow}>
                <TextInput
                  style={[s.customInput, intervalError ? s.customInputError : null]}
                  value={customInterval}
                  onChangeText={(v) => {
                    setCustomInterval(v);
                    if (intervalError) setIntervalError("");
                  }}
                  placeholder="e.g. 1, 90, 720"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleCustomIntervalSave}
                />
                <Button
                  label="Save"
                  onPress={handleCustomIntervalSave}
                  size="md"
                  disabled={!customInterval.trim()}
                />
              </View>
              {intervalError ? <Text style={s.intervalError}>{intervalError}</Text> : null}
              <Text style={s.intervalHint}>
                Minimum 1 minute. Note: Android schedules background wake-ups on its own cadence (often ~15 minutes), so a sub-15-minute setting may not fire every minute. The app rotates only when enough time has actually elapsed since the last rotation.
              </Text>
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

// Human-readable interval (e.g. "1 min", "6 h", "Daily", "Weekly").
function humanInterval(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = hours / 24;
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  return `${Math.round(days * 10) / 10} days`;
}

// Relative time since last rotation, or "Never".
function formatLastRotation(timestamp) {
  if (!timestamp) return "Never";
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h ago`;
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: layout.screenPaddingH },
    title: {
      color: theme.text,
      fontSize: type.display,
      fontWeight: "600",
      letterSpacing: -0.3,
      paddingTop: layout.sectionGap,
      paddingBottom: spacing.sm,
    },
    linkCard: { marginTop: spacing.sm },
    intervalBlock: { paddingTop: spacing.md, paddingBottom: 0 },
    intervalLabel: {
      color: theme.textSecondary,
      fontSize: type.caption,
      fontWeight: "600",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    customRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    customInput: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      fontSize: type.body,
      borderWidth: 1,
      borderColor: "transparent",
    },
    customInputError: { borderColor: theme.danger },
    intervalError: {
      color: theme.danger,
      fontSize: type.caption,
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
    intervalHint: {
      color: theme.textTertiary,
      fontSize: type.caption,
      lineHeight: 17,
      marginTop: spacing.xs,
    },
    versionText: { color: theme.textSecondary, fontSize: type.body },
    stateValue: {
      color: theme.text,
      fontSize: type.body,
      fontWeight: "500",
      textAlign: "right",
      flexShrink: 1,
    },
    footer: {
      color: theme.textTertiary,
      fontSize: type.caption,
      textAlign: "center",
      marginTop: spacing.xxl,
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
