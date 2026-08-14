import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Switch, TouchableOpacity, Alert, ScrollView, TextInput, Keyboard, Button } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getAutoRotate,
  setAutoRotate,
  getRotationIntervalMinutes,
  setRotationIntervalMinutes,
  getSelectedNameIndex,
  getLastRotation,
  resetRotationIndex,
} from "../../services/preferences";
import { registerWallpaperScheduler } from "../../services/schedular/schedular";
import { isTaskRegisteredAsync } from "expo-task-manager";
import { getStatusAsync, BackgroundTaskStatus } from "expo-background-task";
import { runWallpaperBackgroundTask, WALLPAPER_TASK } from "../../services/schedular/backgroundTask";
import { rotateWallpaper } from "../../services/wallpaper/rotation";
import { sendAppNotification } from "../../services/notifications";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { useTheme } from "../../theme";

function formatLastRotation(timestamp) {
  if (!timestamp) return "Never";
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min ago`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [autoRotate, setAutoRotateState] = useState(true);
  const [intervalMinutes, setIntervalMinutesState] = useState("24");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastRotation, setLastRotationState] = useState(null);
  const [osTaskRegistered, setOsTaskRegistered] = useState(null);
  const [osTaskStatus, setOsTaskStatus] = useState(null);
  const totalNames = ASMA_UL_HUSNA.length;
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [auto, interval, index, last, registered, status] = await Promise.all([
        getAutoRotate(),
        getRotationIntervalMinutes(),
        getSelectedNameIndex(),
        getLastRotation(),
        isTaskRegisteredAsync(WALLPAPER_TASK),
        getStatusAsync(),
      ]);
      setAutoRotateState(auto ?? true);
      setIntervalMinutesState(String(interval));
      setInputValue(String(interval));
      setCurrentIndex(index);
      setLastRotationState(last);
      setOsTaskRegistered(registered);
      setOsTaskStatus(status);
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoRotateToggle(value) {
    setAutoRotateState(value);
    await setAutoRotate(value);
    // force=true: re-register so WorkManager picks up the change now
    await registerWallpaperScheduler({ force: true });
  }

  async function handleIntervalSubmit() {
    const minutes = parseFloat(inputValue);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Invalid Input", "Please enter a positive number (e.g., 60 for 1 hour, 1440 for 24 hours)");
      return;
    }
    setIntervalMinutesState(String(minutes));
    await setRotationIntervalMinutes(minutes);
    // force=true: without it the scheduler skips re-registration and the old
    // WorkManager interval would keep running
    await registerWallpaperScheduler({ force: true });
    Keyboard.dismiss();
    Alert.alert("Saved", `Interval set to ${minutes} min.`);
  }

  async function handleResetRotation() {
    Alert.alert(
      "Reset Rotation",
      "This will reset the rotation to the first name. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              await resetRotationIndex();
              setCurrentIndex(0);
              Alert.alert("Success", "Rotation reset to first name");
            } catch (e) {
              console.error("Failed to reset rotation:", e);
              Alert.alert("Error", "Failed to reset rotation");
            }
          },
        },
      ]
    );
  }

  async function handleRotateNow() {
    try {
      const name = await rotateWallpaper({ force: true, source: "test" });
      if (name) {
        await loadSettings();
        Alert.alert("Rotated", `Wallpaper set to ${name.transliteration}`);
      } else {
        Alert.alert("Skipped", "A rotation is already in progress");
      }
    } catch (e) {
      Alert.alert("Error", `Rotation failed: ${e.message}`);
    }
  }

  async function handleTestNotification() {
    const sent = await sendAppNotification("Test Notification", "Notifications are working.");
    if (!sent) {
      Alert.alert(
        "Not Sent",
        "The notification could not be shown — most likely the system notification permission is denied. Enable notifications for this app in system settings, then try again."
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto Rotation</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Auto Rotation</Text>
          <Switch
            value={autoRotate}
            onValueChange={handleAutoRotateToggle}
            trackColor={{ false: theme.inputBorder, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.settingDescription}>
          Automatically change wallpaper based on the interval below
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rotation Interval (minutes)</Text>
        <Text style={styles.settingDescription}>
          Examples: 5 = 5 min, 60 = 1 hour, 1440 = 24 hours. Very short intervals depend on the OS scheduler and battery settings.
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="decimal-pad"
            placeholder="e.g., 15, 60, 1440"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleIntervalSubmit}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleIntervalSubmit}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.currentIntervalText}>
          Current: {intervalMinutes} minute{parseFloat(intervalMinutes) !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/settings/notifications")}>
          <View style={styles.linkText}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={[styles.settingDescription, styles.linkDescription]}>Wallpaper change alerts and more</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/settings/logs")}>
          <View style={styles.linkText}>
            <Text style={styles.settingLabel}>Debug Logs</Text>
            <Text style={[styles.settingDescription, styles.linkDescription]}>
              Every wallpaper change and background task run, with its source
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Current Name Index</Text>
          <Text style={styles.statusValue}>#{currentIndex + 1} of {totalNames}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Auto Rotate</Text>
          <Text style={styles.statusValue}>{autoRotate ? "Enabled" : "Disabled"}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Interval</Text>
          <Text style={styles.statusValue}>{intervalMinutes} minute{parseFloat(intervalMinutes) !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Rotation</Text>
          <Text style={styles.statusValue}>{formatLastRotation(lastRotation)}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>OS Task Registered</Text>
          <Text style={styles.statusValue}>
            {osTaskRegistered === null ? "…" : osTaskRegistered ? "Yes" : "No"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>OS Task Status</Text>
          <Text style={styles.statusValue}>
            {osTaskStatus === BackgroundTaskStatus.Available
              ? "Available"
              : osTaskStatus === BackgroundTaskStatus.Restricted
                ? "Restricted (battery/OEM)"
                : osTaskStatus === null
                  ? "…"
                  : "Unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Rotation</Text>
        <Text style={styles.settingDescription}>
          Rotates immediately, ignoring the interval. The OS background task only fires while the
          app is closed and the device has network — use this to verify rotation works end to end.
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleRotateNow}>
          <Text style={styles.saveButtonText}>Rotate Now</Text>
        </TouchableOpacity>
        <Button
        style={styles.saveButton}
          title="Test Background Task"
          onPress={()=> {
            console.log("Running background task manually for testing...");
            runWallpaperBackgroundTask();
          }}
        />
        {/* <TouchableOpacity style={styles.saveButton} onPress={runWallpaperBackgroundTask}>
          <Text style={styles.saveButtonText}>Run Background Task</Text>
        </TouchableOpacity> */}
      
        <TouchableOpacity style={[styles.saveButton, styles.testButton]} onPress={handleTestNotification}>
          <Text style={styles.saveButtonText}>Test Notification</Text>
        </TouchableOpacity>

      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetRotation}>
          <Text style={styles.dangerButtonText}>Reset Rotation to First Name</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          This app displays the 99 Names of Allah (Asma ul Husna) as dynamic wallpapers.
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
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
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingLabel: {
      fontSize: 15,
      color: theme.text,
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      marginBottom: 12,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    linkText: {
      flex: 1,
    },
    linkDescription: {
      marginBottom: 0,
    },
    inputContainer: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.cardAlt,
    },
    saveButton: {
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    testButton: {
      marginTop: 8,
    },
    saveButtonText: {
      color: theme.onAccent,
      fontSize: 15,
      fontWeight: "600",
    },
    currentIntervalText: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 8,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    statusLabel: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    statusValue: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "500",
    },
    dangerButton: {
      backgroundColor: theme.dangerBg,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
    },
    dangerButtonText: {
      color: theme.danger,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
    },
    aboutText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });