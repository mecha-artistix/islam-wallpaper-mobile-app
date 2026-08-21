import { useCallback, useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  const s = makeStyles(theme);

  const [profile, setProfileState] = useState({ name: null, email: null });
  const [autoRotate, setAutoRotateState] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [customInterval, setCustomInterval] = useState(""); // text for the custom input
  const [intervalError, setIntervalError] = useState("");

  const load = useCallback(async () => {
    const [p, auto, interval] = await Promise.all([
      getProfile(),
      getAutoRotate(),
      getRotationIntervalMinutes(),
    ]);
    setProfileState(p);
    setAutoRotateState(auto);
    setIntervalMinutes(interval);
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
                Minimum 1 minute. Android may schedule the background wake-up on a longer cadence; the app rotates only when enough time has actually elapsed.
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
      marginTop: spacing.sm,
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
