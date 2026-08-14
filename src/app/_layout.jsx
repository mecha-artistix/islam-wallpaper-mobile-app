import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useTheme } from "../theme";
// Note: TaskManager.defineTask is registered from the JS entry (index.js), not
// here. Expo Router only evaluates layout files when ExpoRoot mounts, which
// never happens in a headless (app-closed) JS context — so a side-effect import
// here would NOT register the task consumer headlessly.

export default function RootLayout() {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Asma ul Husna" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="settings/notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="settings/logs" options={{ title: "Debug Logs" }} />
        <Stack.Screen name="editor" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
