import { StyleSheet, Text, View } from "react-native";

export default function WallpaperRenderer({ ism }) {
  return (
    <View style={styles.container}>
      <Text style={styles.arabic}>{ism.name}</Text>

      <Text style={styles.transliteration}>
        {ism.transliteration}
      </Text>

      <Text style={styles.translation}>
        {ism.translation}
      </Text>

      <Text style={styles.meaning}>
        {ism.meaning}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 9 / 16,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  arabic: {
    color: "white",
    fontSize: 56,
    textAlign: "center",
  },

  transliteration: {
    color: "white",
    fontSize: 28,
    marginTop: 20,
    textAlign: "center",
  },

  translation: {
    color: "#cccccc",
    fontSize: 22,
    marginTop: 10,
    textAlign: "center",
  },

  meaning: {
    color: "#999999",
    fontSize: 18,
    marginTop: 40,
    textAlign: "center",
  },
});