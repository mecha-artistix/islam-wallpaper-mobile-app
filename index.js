// Root JS entry point.
//
// CRITICAL ORDERING: import backgroundTask.js BEFORE expo-router/entry.
//
// TaskManager.defineTask(WALLPAPER_TASK, ...) lives in
// src/services/schedular/backgroundTask.js. For the OS background task to run
// while the app is CLOSED, defineTask MUST execute when the bundle loads in a
// headless (app-killed) JS context.
//
// expo-router/entry registers ExpoRoot via AppRegistry, but route/layout modules
// (including src/app/_layout.jsx) are only evaluated when ExpoRoot actually
// mounts — which NEVER happens in a headless context (no Activity / no UI host).
// So importing backgroundTask.js from _layout.jsx does NOT register the task
// consumer headlessly. WorkManager then fires on schedule, finds no JS consumer,
// queues the firings natively, and replays them as a burst at the next
// foreground launch — exactly the bug this fixes.
//
// Importing it here, at the top-level entry, guarantees defineTask runs on every
// bundle load (foreground AND headless).
//
// Refs:
//   https://docs.expo.dev/versions/v57.0.0/sdk/background-task/
//   https://docs.expo.dev/versions/v57.0.0/sdk/task-manager/
import "./src/services/schedular/backgroundTask";
import "expo-router/entry";
