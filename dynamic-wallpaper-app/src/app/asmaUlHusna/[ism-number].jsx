import { Stack, useLocalSearchParams } from "expo-router";
import { Button, StyleSheet, View } from "react-native";
import IsmCard from "../../components/IsmCard";
import { setWallpaper } from "../../services/wallpaper";

export default function IsmPage() {
  const { ism } = useLocalSearchParams();
  const ismullah = JSON.parse(ism);
  function handleSetWallpaper() {
    console.log("Set wallpaper clicked");
    setWallpaper(ismullah);
  }

  return (
    <>
      <Stack.Screen options={{ title: ismullah.transliteration }} />
      <View style={styles.container}>
        <IsmCard name={ismullah} />
        <Button title="Set as Wallpaper" onPress={handleSetWallpaper} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
