# Manual Testing Checklist — Background Rotation

Use this for any change touching rotation, scheduling, or wallpaper generation.
Automated tests (`npm test`) cover logic only; the items below require a device.

## Device setup

- Physical Android device (or emulator with WorkManager support).
- `adb` connected: `adb devices`.
- Build installed: `npx expo prebuild --clean && npx expo run:android` (dev client) OR a release build.
- Note the device model + Android version (some OEMs kill background apps aggressively — see https://dontkillmyapp.com).

## 1. Scheduler registration

- [ ] On first launch (after onboarding), `TaskManager.isTaskRegisteredAsync(WALLPAPER_TASK)` returns `true`.
- [ ] Toggling auto-rotate OFF → `isTaskRegisteredAsync` returns `false`.
- [ ] Toggling auto-rotate ON → returns `true`.
- [ ] Changing the interval → task remains registered (force re-register).

Verify with: `adb shell dumpsys jobscheduler | grep -A 40 -m 1 -E "JOB #.* com.mecha.dailyislamicwallpapers"`
(Look for `Required constraints: TIMING_DELAY CONNECTIVITY` and `Run time: earliest=+...`.)

## 2. Interval — fixed presets

For each preset (1h / 6h / Daily / Weekly):
- [ ] Selecting it stores the value (`getRotationIntervalMinutes()` matches).
- [ ] The OS job's `Run time: earliest` reflects the new interval (±platform minimum).

## 3. Interval — custom input (CRITICAL)

- [ ] Entering `1` and saving stores `1` (NOT 15).
- [ ] Entering `0` or empty → inline error, value not saved.
- [ ] Entering non-numeric → inline error.
- [ ] Entering `90` / `720` etc. → stored verbatim.
- [ ] `getRotationIntervalMinutes()` returns exactly what was entered.
- [ ] The OS job's `earliest` may be larger (platform minimum) — that is expected; `shouldRotate()` honors the user value.

## 4. Auto-rotation — manual trigger (JS path only)

- [ ] "Rotate Now" (if available — currently in the hidden logs area or via dev) rotates the wallpaper immediately.
- [ ] Settings → Debug Logs shows a `bgtask` START/END pair + a `rotation` advancing entry.

⚠️ This proves the JS function works. It does **NOT** prove OS-level scheduling works — see §5.

## 5. Auto-rotation — OS-level (CRITICAL, requires backgrounding)

1. Set interval to the smallest testable value (e.g. 1 min — note the OS may floor to ~15 min).
2. Leave the app via the **Home button** (do NOT swipe-kill).
3. Stop Metro (for a release build) or keep it running (dev client).
4. Wait past the OS wake-up cadence (15-20 min).
5. Watch `adb logcat -s TaskService BackgroundTaskScheduler BackgroundTaskWork HeadlessAppLoader ReactNativeJS`.
6. [ ] `backgroundTask.js loaded` appears with a while-closed timestamp.
7. [ ] `[bgtask] START` / `[bgtask] END` log entries appear with while-closed timestamps.
8. [ ] The device wallpaper visibly changes.
9. [ ] No "burst of N rotations" at the next app open (nothing queued).

Force a firing early (for testing): `adb shell cmd jobscheduler run -f com.mecha.dailyislamicwallpapers <JOB_ID>`
(JOB_ID from the dumpsys output above.)

## 6. Persistence

- [ ] Kill the app (swipe-kill). Reopen. `selectedNameIndex` preserved.
- [ ] `lastRotation` preserved across restarts.
- [ ] `wallpaper_settings` (appearance) preserved.
- [ ] Onboarding does not re-show.

## 7. Concurrency (rotationInFlight)

- [ ] Force multiple concurrent firings (`adb shell cmd jobscheduler run -f` twice rapidly) → only ONE rotation advances the index by 1.
- [ ] After a failed rotation (e.g. generator error), the next firing still rotates (flag cleared).
- [ ] The index is never incremented by 2 from a single scheduled firing.

## 8. Notifications

- [ ] With `wallpaperChange` ON, a rotation posts a local notification.
- [ ] With it OFF, no notification.
- [ ] Permission denial → the toggle refuses to turn on with an alert.

## 9. OEM / battery

- [ ] Note the device's battery-optimization setting for the app (Default / Unrestricted).
- [ ] If rotation fails while closed, set battery optimization to "Unrestricted" and retest.
- [ ] Check https://dontkillmyapp.com for the device model's known issues.

## Result reporting

Use the test report format in `tasks/README.md`. For any OS-level item that
could not be verified, report `NOT TESTED` with the reason — never assume PASS.
