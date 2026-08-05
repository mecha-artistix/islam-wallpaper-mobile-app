import { Stack, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import IsmCard from "../components/IsmCard";
import { registerWallpaperScheduler } from "../services/schedular/schedular";
import { Ionicons } from "@expo/vector-icons";
import { ASMA_UL_HUSNA } from "../data/asmaUlHusna";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    registerWallpaperScheduler().catch((e) =>
      console.error("[Index] scheduler registration failed:", e)
    );
  }, []);

  return (
    <Stack.Screen
      options={{
        title: "Asma ul Husna",
        headerRight: () => (
          <Pressable onPress={() => router.push("/settings")} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </Pressable>
        ),
      }}
    >
      <FlatList
        data={ASMA_UL_HUSNA}
        keyExtractor={(item) => item.number.toString()}
        contentContainerStyle={styles.container}
        ListHeaderComponent={<Text style={styles.header}>Asma ul Husna</Text>}
        renderItem={({ item }) => (
          <Pressable
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
    </Stack.Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  headerButton: {
    padding: 8,
  },
});
