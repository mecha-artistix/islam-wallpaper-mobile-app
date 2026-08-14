import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { getNotificationSettings, setNotificationSetting } from "../../services/preferences";
import { ensureNotificationPermission } from "../../services/notifications";
import { useTheme } from "../../theme";

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    (async () => {
      setSettings(await getNotificationSettings());
    })();
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

  if (!settings) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallpaper</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Wallpaper Change</Text>
            <Text style={styles.description}>Notify when the wallpaper rotates to a new name</Text>
          </View>
          <Switch
            value={settings.wallpaperChange}
            onValueChange={(v) => handleToggle("wallpaperChange", v)}
            trackColor={{ false: theme.inputBorder, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      padding: 16,
    },
    section: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowText: {
      flex: 1,
    },
    label: {
      fontSize: 15,
      color: theme.text,
    },
    description: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
