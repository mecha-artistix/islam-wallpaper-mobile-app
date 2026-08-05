import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Switch, TouchableOpacity, Alert, ScrollView, TextInput, Keyboard } from "react-native";
import { useRouter } from "expo-router";
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
import { rotateWallpaper } from "../../services/wallpaper/rotation";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";

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
  const [autoRotate, setAutoRotateState] = useState(true);
  const [intervalMinutes, setIntervalMinutesState] = useState("24");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastRotation, setLastRotationState] = useState(null);
  const totalNames = ASMA_UL_HUSNA.length;
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [auto, interval, index, last] = await Promise.all([
        getAutoRotate(),
        getRotationIntervalMinutes(),
        getSelectedNameIndex(),
        getLastRotation(),
      ]);
      setAutoRotateState(auto ?? true);
      setIntervalMinutesState(String(interval));
      setInputValue(String(interval));
      setCurrentIndex(index);
      setLastRotationState(last);
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
      const name = await rotateWallpaper({ force: true });
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
            trackColor={{ false: "#767577", true: "#ff8c00" }}
            thumbColor={autoRotate ? "#fff" : "#f4f3f4"}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
  },
  settingDescription: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  saveButton: {
    backgroundColor: "#ff8c00",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  currentIntervalText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statusLabel: {
    fontSize: 16,
    color: "#666",
  },
  statusValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  dangerButton: {
    backgroundColor: "#fff0f0",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  dangerButtonText: {
    color: "#cc0000",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  aboutText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
});