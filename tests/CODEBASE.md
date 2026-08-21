# tests/CODEBASE.md — Testing architecture

The Testing Agent's job: **"Does it work?"** (The Review Agent asks "Was it
implemented correctly?") The Testing Agent runs checks, reports findings, and
does NOT modify application code unless explicitly instructed.

## Test framework

- **Runner:** Jest 29 + `jest-expo` preset (auto-mocks platform modules).
- **Preset:** `@react-native/jest-preset` (matched to RN 0.86).
- **Config:** `jest.config.js` at repo root.
- **Setup:** `tests/unit/setup.js` — fakes `expo-secure-store` + `expo-file-system`
  on `global.__secureStore` / `global.__files`, resets between tests.

## How to run

```bash
npm test              # run all unit tests once
npm run test:watch    # watch mode
```

## Test locations

- `tests/unit/preferences.test.js` — email validation, profile round-trip, onboarding flag, notification settings.
- `tests/unit/interval.test.js` — interval stored verbatim (min 1), no silent 15-min bump, `shouldRotate()` honors user value.
- `tests/unit/rotation.test.js` — `rotationInFlight` concurrency (concurrent calls → one rotation), cleared on success + failure, index advancement + wrap, manual `applyWallpaper` path.
- `tests/MANUAL-CHECKLIST.md` — device/Android manual checklist (background rotation etc.).

## Mocking strategy

- `expo-secure-store` — faked to an in-memory `Map` (`global.__secureStore`).
- `expo-file-system` — `File`/`Paths` faked to an in-memory `Map` (`global.__files`).
- `src/services/wallpaper/generator` — mocked in `rotation.test.js` (Skia not needed for logic tests).
- `src/services/wallpaper/manager` — mocked (native wallpaper setting).
- `src/services/notifications` — mocked (no real notifications).
- `jest.useFakeTimers()` + `jest.setSystemTime()` — controls `Date.now()` for `shouldRotate()` tests.

**Note:** `jest.mock()` factories cannot reference out-of-scope variables
(Babel guard) — variables referenced inside a factory must be prefixed with
`mock` (case-insensitive) or attached to `global`.

## Android / device testing requirements

Automated tests cover **logic only**. The following require a physical device
or emulator and are documented in `tests/MANUAL-CHECKLIST.md`:

- Android WorkManager actually firing the task while the app is closed.
- Wallpaper being set on the device (home + lock).
- Notifications appearing.
- OEM battery-optimization interactions.

## Critical distinction (DO NOT violate)

A manually invoked `runWallpaperBackgroundTask()` PASSING does **NOT** prove the
Android OS invokes the task automatically. The Testing Agent must distinguish:

- ✅ "The JS background-task function works" (testable via `npm test` + manual call).
- ❌ "The Android OS successfully invokes the task automatically" (requires
  `adb logcat` + device + backgrounding via Home + waiting past the interval).

If OS-level behavior cannot be verified, report **`NOT TESTED`** and explain
why. Never claim `PASS` based on assumptions.

## Test report format

When the Testing Agent produces a report, use the format in `tasks/README.md`
(see "Test report format"). Sections: Feature / Changes Tested / Automated
Tests / Manual Tests / Regression Checks / Bugs Found / Reproduction Steps /
Overall Result.

## Known limitations

- No component/integration tests (no `@testing-library/react-native` due to peer-dep conflicts with SDK 57; add only if component testing is needed).
- No E2E / Detox tests.
- OS-level background invocation is manual-only.
- The Skia generator is mocked in rotation tests — its actual rendering is verified by manual use, not automated tests.
