import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Button, Image, StyleSheet, View } from "react-native";
import { generateWallpaperImage } from "../../services/wallpaper/generator";
import { setDeviceWallpaper } from "../../services/wallpaper/manager";
import { setSelectedNameIndex } from "../../services/preferences";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";

export default function IsmPage() {
  const { ism } = useLocalSearchParams();
  const ismullah = JSON.parse(ism);

  const [previewUri, setPreviewUri] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [setting, setSetting] = useState(false);

  async function generatePreview() {
    setGenerating(true);
    try {
      const uri = await generateWallpaperImage(ismullah);
      setPreviewUri(uri);
    } catch (error) {
      Alert.alert("Error", `Failed to generate preview: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    generatePreview();
  }, []);

  async function handleSetWallpaper() {
    if (!previewUri) return;
    setSetting(true);
    try {
      await setDeviceWallpaper(previewUri);
      const index = ASMA_UL_HUSNA.findIndex((n) => n.number === ismullah.number);
      if (index !== -1) await setSelectedNameIndex(index);
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
          <ActivityIndicator size="large" color="#ff8c00" style={styles.preview} />
        ) : (
          previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />
        )}
        <Button
          title={setting ? "Setting..." : "Set as Wallpaper"}
          onPress={handleSetWallpaper}
          disabled={generating || setting || !previewUri}
          color="#ff8c00"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  preview: {
    width: "80%",
    aspectRatio: 9 / 16,
    borderRadius: 8,
  },
});
