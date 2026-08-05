import { Stack, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import IsmCard from "../components/IsmCard";
import { registerWallpaperScheduler } from "../services/schedular/schedular";
import { ASMA_UL_HUSNA } from "../data/asmaUlHusna";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    registerWallpaperScheduler();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={12} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={22} color="#ff8c00" />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={ASMA_UL_HUSNA}
        keyExtractor={(item) => item.number.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() =>
              router.push({
                pathname: "/asmaUlHusna/[ism-number]",
                params: { ism: JSON.stringify(item) },
              })
            }
          >
            <IsmCard name={item} />
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
  headerButton: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
