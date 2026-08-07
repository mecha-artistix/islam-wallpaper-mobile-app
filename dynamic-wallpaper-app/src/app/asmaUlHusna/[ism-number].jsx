import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { generateWallpaperImage } from "../../services/wallpaper/generator";
import { setDeviceWallpaper } from "../../services/wallpaper/manager";
import { setSelectedNameIndex, setLastRotation } from "../../services/preferences";
import { notifyWallpaperChanged } from "../../services/notifications";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { useTheme } from "../../theme";

export default function IsmPage() {
  const router = useRouter();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { ism } = useLocalSearchParams();
  const ismullah = JSON.parse(ism);

  const [previewUri, setPreviewUri] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [setting, setSetting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const uri = await generateWallpaperImage(ismullah);
        setPreviewUri(uri);
      } catch (error) {
        Alert.alert("Error", `Failed to generate preview: ${error.message}`);
      } finally {
        setGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSetWallpaper() {
    if (!previewUri) return;
    setSetting(true);
    try {
      await setDeviceWallpaper(previewUri);
      const index = ASMA_UL_HUSNA.findIndex((n) => n.number === ismullah.number);
      if (index !== -1) await setSelectedNameIndex(index);
      // Restart the rotation clock — otherwise an auto-rotation could fire
      // seconds after the user manually picks a name
      await setLastRotation(Date.now());
      await notifyWallpaperChanged(ismullah);
      Alert.alert("Success", "Wallpaper set successfully!");
    } catch (error) {
      Alert.alert("Error", `Failed to set wallpaper: ${error.message}`);
    } finally {
      setSetting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: ismullah.transliteration }} />
      <View style={styles.container}>
        {generating ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.preview} />
        ) : (
          previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />
        )}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, (generating || setting || !previewUri) && styles.buttonDisabled]}
          onPress={handleSetWallpaper}
          disabled={generating || setting || !previewUri}
        >
          {setting ? <ActivityIndicator color={theme.onAccent} /> : <Text style={[styles.buttonText, styles.buttonPrimaryText]}>Set as Wallpaper</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => router.push({ pathname: "/editor", params: { ism } })}>
          <Text style={styles.buttonText}>Customize</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 20,
    },
    preview: {
      width: "80%",
      aspectRatio: 9 / 16,
      borderRadius: 16,
      marginBottom: 8,
    },
    button: {
      alignSelf: "stretch",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonPrimary: {
      backgroundColor: theme.accent,
    },
    buttonSecondary: {
      backgroundColor: theme.cardAlt,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
    },
    buttonPrimaryText: {
      color: theme.onAccent,
    },
  });
