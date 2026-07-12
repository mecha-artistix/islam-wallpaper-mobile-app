import { View, Text, StyleSheet } from "react-native";

function Ism({ name }) {
  return (
    <View style={styles.container}>
      <Text>{name.name}</Text>
      <Text>{name.transliteration}</Text>
      <Text>{name.translation}</Text>
      <Text>{name.meaning}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  number: {
    fontWeight: "bold",
  },
  transliteration: {
    fontSize: 18,
  },
  translation: {
    color: "#666",
  },
});
export default Ism;
