# Wallpaper Rotation — Complete Technical Reference

## Purpose

Background rotation of the device wallpaper through the 99 Names of Allah (Asma ul Husna). The wallpaper changes on a user-defined interval while the app is closed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  App (foreground)                                           │
│                                                             │
│  index.jsx ──▶ registerWallpaperScheduler()                 │
│  settings/index.jsx ──▶ registerWallpaperScheduler()        │
└──────────────────────────────┬──────────────────────────────┘
                               │ registers with
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Android OS — WorkManager (BackgroundTask)                   │
│                                                             │
│  OneTimeWorkRequest                                         │
│    └─ setInitialDelay(intervalMinutes)                      │
│    └─ constraint: NetworkType.CONNECTED  ← known issue      │
│    └─ re-enqueues itself after each run                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ fires after delay (app closed)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  backgroundTask.js — TaskManager.defineTask("wallpaper-task")│
│                                                             │
│  1. shouldRotate()        → check interval elapsed          │
│  2. getSelectedNameIndex() → read current position          │
│  3. nextIndex = (current + 1) % 99                          │
│  4. generateWallpaperImage(name) → Skia → PNG in cache      │
│  5. setDeviceWallpaper(uri) → native module → setBitmap()   │
│  6. setSelectedNameIndex(nextIndex) → save to SecureStore   │
│  7. setLastRotation(Date.now()) → save timestamp            │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### 1. `src/services/schedular/schedular.js`

**Exported:** `registerWallpaperScheduler()`

**Calls:**
- `getAutoRotate()` → `preferences.js`
- `getRotationIntervalMinutes()` → `preferences.js`
- `BackgroundTask.unregisterTaskAsync(taskName)` → `expo-background-task`
- `BackgroundTask.registerTaskAsync(taskName, { minimumInterval })` → `expo-background-task`
- `TaskManager.isTaskRegisteredAsync(taskName)` → `expo-task-manager` (logging only)

**Called from:**
- `src/app/index.jsx` — on every app open
- `src/app/settings/index.jsx` — after toggle autoRotate or save interval

**Logic:**
1. If `autoRotate === false` → unregister task, return
2. Read `intervalMinutes` from SecureStore
3. `minimumInterval = Math.max(1, Math.round(intervalMinutes))`
4. Unregister existing task (required — `registerTaskAsync` is no-op if already registered)
5. Register with new interval

**Log prefix:** `[Scheduler]`

---

### 2. `src/services/schedular/backgroundTask.js`

**Exported:** `WALLPAPER_TASK = "wallpaper-task"` (string constant)

**Side effect on import:** calls `TaskManager.defineTask(WALLPAPER_TASK, handler)`  
This MUST be imported at app root level so the handler is registered before the OS fires the task.

**Imports:**
- `TaskManager` from `expo-task-manager`
- `BackgroundTaskResult` from `expo-background-task`
- `ASMA_UL_HUSNA` from `../../data/asmaUlHusna`
- `generateWallpaperImage` from `../wallpaper/generator`
- `setDeviceWallpaper` from `../wallpaper/manager`
- `getSelectedNameIndex, setSelectedNameIndex, setLastRotation, shouldRotate` from `../preferences`

**Return values:**
- `BackgroundTaskResult.Success` (= 1) — task completed (even if rotation was skipped)
- `BackgroundTaskResult.Failed` (= 2) — exception occurred

**Log prefix:** `[BGTask]`

---

### 3. `src/services/preferences.js`

All values stored in `expo-secure-store` (encrypted key-value).

| Function | Key | Default | Type |
|---|---|---|---|
| `getAutoRotate()` | `wallpaper_auto_rotate` | `true` (null = not set = enabled) | boolean |
| `setAutoRotate(bool)` | same | — | void |
| `getSelectedNameIndex()` | `wallpaper_selected_name_index` | `0` | integer 0–98 |
| `setSelectedNameIndex(n)` | same | — | void |
| `getRotationIntervalMinutes()` | `wallpaper_rotation_interval_minutes` | `1440` (24h) | float |
| `setRotationIntervalMinutes(n)` | same | — | void |
| `getLastRotation()` | `wallpaper_last_rotation` | `null` | timestamp ms or null |
| `setLastRotation(ts)` | same | — | void |
| `resetRotationIndex()` | both index + lastRotation | — | sets index=0, lastRotation=now |
| `shouldRotate()` | reads all | — | boolean |

**`shouldRotate()` logic:**
```
if autoRotate == false → return false
if lastRotation == null → return true   (never rotated)
minutesSince = (now - lastRotation) / 60000
return minutesSince >= intervalMinutes
```

---

### 4. `src/services/wallpaper/generator.js`

**Exported:** `generateWallpaperImage(ism)`

**Input:** `{ number, name (Arabic), transliteration, translation, meaning }`  
**Output:** `file:///.../cache/wallpaper_<number>.png` (URI string)

**Steps:**
1. `Skia.Surface.Make(1080, 1920)` → off-screen canvas
2. Draw gradient background via `Skia.Shader.MakeLinearGradient`
3. Load Arabic font via `Image.resolveAssetSource(require(...NotoNaskhArabic...))` + `Skia.Data.fromURI` (cached after first load)
4. Draw Arabic name via `Skia.ParagraphBuilder.Make(RTL + Center, fontProvider)` → proper shaping
5. Draw Latin fields via `matchFont({ fontFamily: "sans-serif" })` + `canvas.drawText`
6. `surface.makeImageSnapshot()` → `image.encodeToBytes()` → `Uint8Array`
7. `new File(Paths.cache, wallpaper_N.png)` → `file.write(bytes)`

**Font typeface cache:** `arabicFontProvider` is module-level — loaded once per app session.

---

### 5. `src/services/wallpaper/manager.js`

**Exported:** `setDeviceWallpaper(uri)`

Calls `setWallpaper(uri, "both")` from the local native module.

**Native module:** `modules/wallpaper-manager/android/WallpaperManagerModule.kt`

**Steps:**
1. `Uri.parse(uri).path` → file path string
2. `File(filePath).exists()` → throws if not found
3. `BitmapFactory.decodeFile(path)` → Bitmap
4. `WallpaperManager.getBitmap(bitmap, null, true, FLAG_SYSTEM | FLAG_LOCK)`

---

## Registration Flow

```
App opens
  └─ index.jsx useEffect
       └─ registerWallpaperScheduler()
            ├─ getAutoRotate()         [SecureStore read]
            ├─ getRotationIntervalMinutes()  [SecureStore read]
            ├─ BackgroundTask.unregisterTaskAsync("wallpaper-task")
            └─ BackgroundTask.registerTaskAsync("wallpaper-task", { minimumInterval })
                  └─ Android: BackgroundTaskConsumer.didRegister()
                       └─ BackgroundTaskScheduler.registerTask(context, intervalMinutes)
                            └─ WorkManager.enqueueUniqueWork(
                                 "EXPO_BACKGROUND_WORKER",
                                 OneTimeWorkRequest with initialDelay = intervalMinutes
                               )
```

---

## Execution Flow

```
OS fires WorkManager job (after intervalMinutes delay)
  └─ BackgroundTaskWork.doWork()
       └─ BackgroundTaskScheduler.runTasks(context, appScopeKey)
            ├─ if inForeground == true → reschedule, skip  ← debug point
            └─ BackgroundTaskConsumer.executeTask()
                 └─ TaskManager executes JS handler in backgroundTask.js
                      ├─ shouldRotate()         [SecureStore reads]
                      ├─ getSelectedNameIndex() [SecureStore read]
                      ├─ generateWallpaperImage(name) [Skia]
                      ├─ setDeviceWallpaper(uri) [native module]
                      ├─ setSelectedNameIndex(nextIndex) [SecureStore write]
                      └─ setLastRotation(now)  [SecureStore write]
       └─ (on Android O+) scheduleWorker() → enqueues next OneTimeWorkRequest
```

---

## Known Issues & Debug Points

### Issue 1 — `NetworkType.CONNECTED` constraint (hardcoded in library)

**File:** `node_modules/expo-background-task/android/src/main/java/expo/modules/backgroundtask/BackgroundTaskScheduler.kt` line ~107

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build()
```

**Effect:** WorkManager will NOT fire the task if the device has no network (WiFi or cellular) at the scheduled time. It waits until network is available.

**Workaround:** None without patching the library. Use `patch-package` to remove this constraint if rotation is unreliable without network.

**Check:** Run `adb shell dumpsys jobscheduler | grep -A5 "EXPO_BACKGROUND"` — if it shows "unsatisfied constraints: network", the device has no network at fire time.

### Issue 2 — `inForeground` check blocks foreground trigger

**File:** `BackgroundTaskScheduler.kt` line ~221

When the app is open (foreground), `runTasks` skips execution and reschedules for later. This is why `triggerTaskWorkerForTestingAsync()` returns a void/falsy value when called from within the app.

**Check:** `triggerTaskWorkerForTestingAsync()` only executes the task body when `inForeground == false` (app is backgrounded). The "Trigger returned false" alert is expected — `runTasks` returns `Unit` (void), not a Boolean.

### Issue 3 — `defineTask` must be imported before registration

`backgroundTask.js` must be imported (transitively) before `registerTaskAsync` is called. If the task name is registered with WorkManager but `defineTask` hasn't run, the OS wakes the app and can't find the handler → `WARN No task registered for key expo-task-manager`.

**Current import chain:** `backgroundTask.js` → imported by `schedular.js` → imported by `index.jsx` ✓

---

## Debug Checklist

When rotation is not working, check these in order:

| Step | What to check | Log to look for |
|---|---|---|
| 1 | Task registered? | `[Scheduler] registered: true` |
| 2 | Correct interval? | `[Scheduler] tasks: [...minimumInterval: N...]` |
| 3 | autoRotate enabled? | `[Scheduler] autoRotate: true` |
| 4 | Task fired? | `[BGTask] ▶ fired at ...` |
| 5 | shouldRotate passed? | `[BGTask] shouldRotate: true` |
| 6 | Image generated? | `[BGTask] image ready: file://...` |
| 7 | Wallpaper set? | `[BGTask] ✓ wallpaper set` |
| 8 | State saved? | `[BGTask] ✓ state saved` |

If step 4 never appears after the interval, the OS is not firing the job. Check:
- Network constraint (Issue 1 above)
- Battery optimization — go to Android Settings → Apps → [app] → Battery → Unrestricted
- ADB: `adb shell dumpsys jobscheduler | grep -B2 -A15 "EXPO_BACKGROUND"`

---

## ADB Testing Commands

```bash
# Check if WorkManager job is scheduled and what constraints block it
adb shell dumpsys jobscheduler | grep -B2 -A15 "EXPO_BACKGROUND"

# Find the job ID (look for "job #<N>" near "EXPO_BACKGROUND")
# Then force-run it immediately
adb shell cmd jobscheduler run -f com.anonymous.dynamicwallpaperapp <job_id>

# Watch live logs from the background task (filter by tag)
adb logcat | grep -E "\[BGTask\]|\[Scheduler\]|BackgroundTask|BackgroundTaskScheduler"

# Check WorkManager state
adb shell dumpsys activity service WorkManagerImpl
```

---

## SecureStore State Inspector (add temporarily to settings for debugging)

```javascript
import * as SecureStore from "expo-secure-store";

async function dumpState() {
  const keys = ["wallpaper_auto_rotate", "wallpaper_selected_name_index",
                "wallpaper_rotation_interval_minutes", "wallpaper_last_rotation"];
  const values = await Promise.all(keys.map(k => SecureStore.getItemAsync(k)));
  console.log("[State]", Object.fromEntries(keys.map((k, i) => [k, values[i]])));
}
```

---

## Package Versions (as of current build)

| Package | Version | Role |
|---|---|---|
| `expo-task-manager` | bundled with expo ~57 | `defineTask`, `isTaskRegisteredAsync`, `getRegisteredTasksAsync` |
| `expo-background-task` | bundled with expo ~57 | `registerTaskAsync`, `unregisterTaskAsync`, `BackgroundTaskResult` |
| `expo-secure-store` | ~14.x | all preference persistence |
| `@shopify/react-native-skia` | 2.6.2 | wallpaper image generation |
| local `modules/wallpaper-manager` | — | `setWallpaper(uri, target)` native call |

---

## File Map

```
src/services/schedular/
  schedular.js          registerWallpaperScheduler() — registration only
  backgroundTask.js     WALLPAPER_TASK constant + defineTask handler

src/services/
  preferences.js        all SecureStore reads/writes

src/services/wallpaper/
  generator.js          Skia canvas → PNG file
  manager.js            JS bridge to native module

modules/wallpaper-manager/
  android/WallpaperManagerModule.kt   WallpaperManager.setBitmap()

node_modules/expo-background-task/
  android/.../BackgroundTaskScheduler.kt   WorkManager scheduling (has network constraint)
  android/.../BackgroundTaskConsumer.kt    bridges Expo task → WorkManager
  android/.../BackgroundTaskModule.kt      registerTaskAsync, unregisterTaskAsync, triggerForTesting
```
