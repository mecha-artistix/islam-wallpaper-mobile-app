import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { useEffect } from "react";
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
    <Stack
      styles={styles.container}
      screenOptions={{
        headerStyle: { backgroundColor: "#ff8c00" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
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
