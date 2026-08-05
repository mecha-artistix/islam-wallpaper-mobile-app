import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useTheme } from "../theme";
// Imported at root so TaskManager.defineTask runs before the OS fires the
// background task in a headless (app-killed) JS context
import "../services/schedular/backgroundTask";
import { rotateWallpaper } from "../services/wallpaper/rotation";
import { getAutoRotate, getRotationIntervalMinutes, getLastRotation } from "../services/preferences";

// How often the timer wakes up at most — caps the delay so interval changes
// in settings take effect within a minute without restarting the app.
const MAX_TICK_MS = 60 * 1000;
// Wake-up period while auto-rotate is off, so enabling it in settings takes
// effect without restarting the app.
const OFF_RECHECK_MS = 60 * 1000;

export default function RootLayout() {
  const theme = useTheme();
  const scheme = useColorScheme();
  // Foreground rotation timer.
  // expo-background-task never runs while the app is in the foreground (native
  // inForeground check in BackgroundTaskScheduler), so without this timer the
  // wallpaper would never rotate while the app is open. The OS task covers the
  // backgrounded/killed case. Both paths funnel through rotateWallpaper(),
  // which is gated by shouldRotate() and an in-flight guard.
  useEffect(() => {
    let timer = null;
    let active = true;

    async function tick() {
      try {
        await rotateWallpaper();
      } catch (e) {
        console.error("[FGRotation] ✗ error:", e.message);
      } finally {
        if (active) scheduleNext();
      }
    }

    async function scheduleNext() {
      const autoRotate = await getAutoRotate();
      if (!autoRotate) {
        timer = setTimeout(tick, OFF_RECHECK_MS);
        return;
      }

      const intervalMs = (await getRotationIntervalMinutes()) * 60 * 1000;
      const lastRotation = await getLastRotation();
      const elapsed = lastRotation ? Date.now() - lastRotation : intervalMs;
      // Fire at the boundary: if 40s of a 60s interval elapsed, wait 20s
      const remaining = Math.max(5000, intervalMs - elapsed);
      timer = setTimeout(tick, Math.min(remaining, MAX_TICK_MS));
    }

    scheduleNext();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

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
        <Stack.Screen name="editor" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
