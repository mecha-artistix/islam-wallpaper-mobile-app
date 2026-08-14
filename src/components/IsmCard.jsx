import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

export default function IsmCard({ name }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.card}>
      <View style={styles.numberBadge}>
        <Text style={styles.number}>{name.number}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.transliteration}>{name.transliteration}</Text>
        <Text style={styles.translation} numberOfLines={1}>
          {name.translation}
        </Text>
      </View>
      <Text style={styles.arabic}>{name.name}</Text>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    numberBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    number: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: "700",
    },
    textBlock: {
      flex: 1,
      marginLeft: 12,
    },
    transliteration: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    translation: {
      color: theme.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    arabic: {
      color: theme.text,
      fontSize: 22,
      marginLeft: 12,
    },
  });
