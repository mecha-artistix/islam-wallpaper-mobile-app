import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
// Imported at root so defineTask runs before the OS fires the background task
import "../services/schedular/backgroundTask";
import { tryRotateWallpaper, sendRotationNotification } from "../services/wallpaper/rotation";
import { getAutoRotate, getRotationIntervalMinutes, getLastRotation } from "../services/preferences";

// Configure how notifications appear while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  // Request notification permission once on first launch
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // Foreground rotation timer.
  // expo-background-task refuses to run while inForeground=true, so we handle
  // the "app is open" case here with a plain JS setTimeout chain.
  useEffect(() => {
    let timer = null;
    let active = true;

    async function rotate() {
      try {
        const name = await tryRotateWallpaper();
        if (name) {
          console.log(`[FGRotation] ✓ rotated to ${name.transliteration}`);
          await sendRotationNotification(name);
        } else {
          console.log("[FGRotation] ⏭ skipped — interval not elapsed");
        }
      } catch (e) {
        console.error("[FGRotation] ✗ error:", e.message);
      } finally {
        if (active) scheduleNext();
      }
    }

    async function scheduleNext() {
      const autoRotate = await getAutoRotate();
      if (!autoRotate) {
        console.log("[FGRotation] stopped — auto rotate off");
        return;
      }

      const intervalMinutes = await getRotationIntervalMinutes();
      const intervalMs = intervalMinutes * 60 * 1000;
      const lastRotation = await getLastRotation();
      const elapsed = lastRotation ? Date.now() - lastRotation : intervalMs;
      // Fire at the correct time: if 40s of a 60s interval have passed, wait 20s not 60s
      const remaining = Math.max(2000, intervalMs - elapsed);

      console.log(`[FGRotation] next in ${Math.round(remaining / 1000)}s`);
      timer = setTimeout(rotate, remaining);
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
});
