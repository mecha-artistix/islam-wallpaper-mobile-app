import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { getLogs, clearLogs } from "../services/logger";
import { Button } from "../components/ui";
import { useTheme, spacing, type, layout } from "../theme";

// Activity log — the persistent file log of wallpaper changes and background
// task runs. Kept for diagnostics; NOT linked from the normal Settings UI.
// Reachable only via a long-press on the About screen's "About this app" row.
export default function LogsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);
  const [logs, setLogs] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getLogs().then(setLogs);
    }, [])
  );

  function handleClear() {
    Alert.alert("Clear log", "Delete all logged events?", [
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
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.actions}>
        <Button label="Refresh" variant="soft" size="md" onPress={() => getLogs().then(setLogs)} />
        <Button label="Clear" variant="danger" size="md" onPress={handleClear} />
      </View>
      <FlatList
        data={logs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={[s.list, { paddingBottom: layout.scrollBottomPushed + insets.bottom }]}
        ListEmptyComponent={<Text style={s.empty}>No events recorded yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.time}>{formatTime(item.t)}</Text>
            <Text style={s.tag}>{item.tag}</Text>
            <Text style={s.message}>{item.message}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function formatTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: layout.screenPaddingH,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    list: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing.xxl },
    empty: { color: theme.textSecondary, fontSize: type.body, textAlign: "center", marginTop: spacing.xxxl },
    row: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.divider,
    },
    time: {
      color: theme.textTertiary,
      fontSize: type.micro,
      fontVariant: ["tabular-nums"],
      width: 110,
    },
    tag: {
      color: theme.accent,
      fontSize: type.micro,
      fontWeight: "700",
      width: 70,
    },
    message: {
      color: theme.text,
      fontSize: type.caption,
      flex: 1,
    },
  });
