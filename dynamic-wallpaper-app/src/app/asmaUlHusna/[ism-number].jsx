import { useRef } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Button, StyleSheet, View, Text } from "react-native";
import IsmCard from "../../components/IsmCard";
import {
  captureWallpaper,
  saveWallpaper,
  setDeviceWallpaper,
} from "../../services/wallpaper";
import ViewShot from "react-native-view-shot";
import WallpaperRenderer from "../../components/WallpaperRenderer";




export default function IsmPage() {
  const { ism } = useLocalSearchParams();
  const ismullah = JSON.parse(ism);
 const wallpaperRef = useRef(null);
 async function captureWallpaper() {
  const uri = await wallpaperRef.current.capture();

  console.log("Captured:", uri);

  return uri;
}

async function handleSetWallpaper() {
  const tempUri = await captureWallpaper(wallpaperRef);

  const wallpaperUri = await saveWallpaper(tempUri);

  await setDeviceWallpaper(wallpaperUri);
}

  return (
    <>
      <Stack.Screen options={{ title: ismullah.transliteration }} />
      <View style={styles.container}>

      <ViewShot
        ref={wallpaperRef}
        options={{
          format: "png",
          quality: 1,
        }}
      >
        <WallpaperRenderer ism={ismullah} />
      </ViewShot>

        
        <Button title="Set as Wallpaper" onPress={handleSetWallpaper} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
