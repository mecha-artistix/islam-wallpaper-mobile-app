import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { getLogs, clearLogs } from "../../services/logger";
import { useTheme } from "../../theme";

function formatTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function LogsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [logs, setLogs] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getLogs().then(setLogs);
    }, [])
  );

  function handleClear() {
    Alert.alert("Clear Logs", "Delete all logged events?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearLogs();
          setLogs([]);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => getLogs().then(setLogs)}>
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={handleClear}>
          <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={logs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No events logged yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.time}>{formatTime(item.t)}</Text>
            <Text style={styles.tag}>{item.tag}</Text>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      padding: 16,
      paddingBottom: 8,
    },
    actionButton: {
      backgroundColor: theme.cardAlt,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    actionButtonText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    clearButton: {
      backgroundColor: theme.dangerBg,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
    },
    clearButtonText: {
      color: theme.danger,
    },
    list: {
      padding: 16,
      paddingTop: 8,
    },
    empty: {
      color: theme.textSecondary,
      fontSize: 14,
      textAlign: "center",
      marginTop: 40,
    },
    row: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    time: {
      color: theme.textSecondary,
      fontSize: 12,
      fontVariant: ["tabular-nums"],
    },
    tag: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: "700",
      width: 62,
    },
    message: {
      color: theme.text,
      fontSize: 13,
      flex: 1,
    },
  });
