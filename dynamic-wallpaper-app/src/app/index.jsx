import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import IsmCard from "../components/IsmCard";
import { get_asma_ul_husna } from "../services/api";
import * as Notifications from "expo-notifications";


export default function Index() {
  const [asmaUlHusna, setAsmaUlHusna] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const router = useRouter();

  useEffect(() => {
    registerWallpaperScheduler();
  }, []);
  
  Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});




  useEffect(() => {
    async function fetchAsmaUlHusna() {
      try {
        setLoading(true);
        const data = await get_asma_ul_husna();
        const names = data?.data?.names;
        setAsmaUlHusna(names);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    }

    fetchAsmaUlHusna();
  }, []);

  return (
    <FlatList
      data={asmaUlHusna}
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
});
