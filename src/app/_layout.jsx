import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useTheme } from "../theme";
import { EXPO_FONTS } from "../services/wallpaper/fonts";

// Root layout. Sets up:
//   - splash screen (held until fonts load AND the onboarding gate resolves,
//     handled in (tabs)/index.jsx — the initial route)
//   - custom Arabic/Latin fonts for RN Text (previews, lists)
//   - the navigation Stack with all routes
//
// Note: TaskManager.defineTask is registered from the JS entry (index.js),
// NOT here — see the comment in index.js. Layout files only evaluate when
// ExpoRoot mounts, which never happens in a headless (app-closed) context.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts(EXPO_FONTS);

  // Hide the splash once fonts are ready. The onboarding gate (in Home) also
  // holds/hides the splash as needed; calling hideAsync twice is a no-op.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: "600", fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
          headerBackTitleVisible: false,
        }}
      >
        {/* Bottom-tabbed main app */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* First-launch onboarding (shown over the tabs as a full screen) */}
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
        {/* Pushed routes */}
        <Stack.Screen name="name/[id]" options={{ title: "" }} />
        <Stack.Screen name="customize" options={{ title: "Customize", presentation: "modal" }} />
        <Stack.Screen name="profile" options={{ title: "Edit Profile" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
        {/* Hidden developer/activity log — reachable only via a long-press on
            the About screen title. Not linked from normal Settings. */}
        <Stack.Screen name="logs" options={{ title: "Activity Log" }} />
      </Stack>
    </>
  );
}
