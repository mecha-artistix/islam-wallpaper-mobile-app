import { useEffect, useState } from "react";
import { Text, View, StyleSheet, Screen } from "react-native";
import { get_asma_ul_husna } from "../services/api";
import { FlatList } from "react-native";
import Ism from "./asmaUlHusna/ism";

export default function Index() {
  const [asmaUlHusna, setAsmaUlHusna] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      ListHeaderComponent={
        <Text style={styles.header}>Asma ul Husna test</Text>
      }
      renderItem={({ item }) => <Ism name={item} />}
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
