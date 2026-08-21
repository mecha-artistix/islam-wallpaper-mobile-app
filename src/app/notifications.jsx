import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getNotificationSettings, setNotificationSetting } from "../services/preferences";
import { ensureNotificationPermission } from "../services/notifications";
import { Card, SectionLabel, SwitchRow } from "../components/ui";
import { useTheme, spacing, layout } from "../theme";

// Notifications settings — a single, calm toggle for wallpaper-change alerts.
// More notification types can be added as new keys in notification_settings +
// a row here; the underlying storage already supports it.
export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    (async () => setSettings(await getNotificationSettings()))();
  }, []);

  async function handleToggle(key, value) {
    if (value && !(await ensureNotificationPermission())) {
      Alert.alert(
        "Notifications Disabled",
        "Notification permission was not granted. Enable notifications for this app in system settings to use this option."
      );
      return;
    }
    setSettings(await setNotificationSetting(key, value));
  }

  if (!settings) return <View style={s.container} />;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: layout.scrollBottomPushed + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <SectionLabel>Wallpaper</SectionLabel>
        <Card>
          <SwitchRow
            title="Wallpaper change"
            subtitle="Notify when the wallpaper rotates to a new name"
            value={settings.wallpaperChange}
            onValueChange={(v) => handleToggle("wallpaperChange", v)}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing.lg },
  });
