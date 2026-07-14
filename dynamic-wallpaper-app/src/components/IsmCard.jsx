import { StyleSheet, Text, View } from "react-native";
import getTextColor from "../utils/getTextColor";

const bgColor = "#000";
const textColor = getTextColor(bgColor);
function IsmCard({ name }) {
  //   const textColor = "#fff";

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{name.name}</Text>
      <Text style={styles.text}>{name.transliteration}</Text>
      <Text style={styles.text}>{name.translation}</Text>
      <Text style={styles.text}>{name.meaning}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: bgColor,
    padding: 16,
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: textColor,
    textAlign: "center",
  },
});
export default IsmCard;
