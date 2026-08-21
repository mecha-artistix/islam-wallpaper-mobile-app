# AGENTS.md — Global rules for AI agents

Read this before touching any file. It is intentionally short. Feature-specific
context lives in `docs/features/<feature>.md` (see `CODEBASE.md` for the map).

## Project purpose

An Android app (Expo / React Native) that sets the 99 Names of Allah (Asma ul
Husna) as the device wallpaper and rotates them automatically via an Android
background task. Calm, minimal, dark-first UI. No backend yet; accounts are
planned but not built.

## Architecture principles (do not violate)

1. **Background-only rotation.** Automatic wallpaper rotation happens ONLY via
   the Android background task (`expo-background-task` + `expo-task-manager`).
   There is NO foreground rotation mechanism. Do NOT reintroduce `setInterval`,
   `AppState`-based rotation, `setTimeout` rotation loops, or a foreground
   timer. See `docs/decisions/001-background-only-rotation.md`.
2. **`defineTask` runs from the JS entry.** `TaskManager.defineTask` is imported
   in `index.js` BEFORE `expo-router/entry` so it executes in headless
   (app-closed) contexts. Do NOT move it into a layout/screen/component.
   See `docs/decisions/002-defineTask-from-js-entry.md`.
3. **User interval is preserved verbatim (min 1 minute).** The OS scheduler
   may fire on its own minimum cadence; `shouldRotate()` (elapsed-time gate)
   honors the user's value. Do NOT silently bump to 15 minutes.
   See `docs/decisions/003-user-interval-vs-os-scheduler-minimum.md`.
4. **One rotation routine, one in-flight guard.** All wallpaper changes funnel
   through `src/services/wallpaper/rotation.js#rotateWallpaper` /
   `applyWallpaper`. The `rotationInFlight` flag is set before the first `await`
   and cleared in `finally`. Do not remove it or add parallel paths.
5. **Service boundaries (no cycles).** `scheduling → rotation → wallpaper →
   wallpaper-manager (native)`. `app-ui`/`settings-ui` → services. `preferences`
   is a leaf. `wallpaper` must not import `rotation`/`scheduling`.
6. **Source of truth hierarchy.** Source code → feature `CODEBASE.md` → root
   `CODEBASE.md`. If docs contradict code, code wins; then update the docs.

## Coding conventions

- TypeScript-flavored JS (`.js`/`.jsx`); Expo Router file-based routing.
- Preferences via `expo-secure-store` (see `src/services/preferences.js`).
- Use theme tokens (`src/theme.js`), never raw hex colors in components.
- `shadcn/ui`-style shared components live in `src/components/ui/`.
- Read the exact versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/
  before writing Expo API code.

## How to find your feature documentation

1. Read `CODEBASE.md` (the map) — it lists every feature and the path to its doc.
2. Open only `docs/features/<your-feature>.md`.
3. Open only the source files that doc lists under "Relevant files".
4. Do NOT load unrelated feature docs or the whole `node_modules`.

## Agent workflow

```
Main Agent
  → reads AGENTS.md + CODEBASE.md (the map)
  → delegates to Feature Agent (reads only docs/features/<feature>.md + listed source)
  → Feature Agent implements
  → Testing Agent (reads AGENTS + CODEBASE + tests/CODEBASE.md + feature doc;
    runs `npm run lint` + `npm test`; uses tests/MANUAL-CHECKLIST.md for device
    checks; NEVER claims OS-level background PASS without a device)
  → Review Agent (checks boundaries, race conditions, doc accuracy, regressions;
    reports findings, does NOT silently change code)
  → Main Agent
```

## Testing requirements

- **Every code change:** `npm run lint` (must be 0 errors).
- **Logic changes:** `npm test` (unit tests in `tests/unit/`). Add tests for new
  logic (preferences, rotation, interval, validation).
- **Background rotation / Android behavior:** follow `tests/MANUAL-CHECKLIST.md`
  on a device. A passing `runWallpaperBackgroundTask()` call does NOT prove the
  OS invokes the task — distinguish "JS function works" from "OS schedules it".
  If you can't verify OS behavior, report `NOT TESTED`.
- **Native/Android changes:** `npx expo prebuild --clean && npx expo run:android`
  + device smoke test. Do not run an Android build for trivial UI/doc changes.

## Documentation maintenance

- If you change architecture, feature behavior, public functions, dependencies,
  or state flow → update the relevant `docs/features/<feature>.md`.
- If an architectural decision changes → update or create a doc in
  `docs/decisions/` (numbered, e.g. `004-...`).
- Never leave docs that contradict the code.

## Git / change rules

- Clear commit message describing what + why.
- Never commit secrets, API keys, `.env`, build artifacts, or generated files.
- Never force-push or rewrite existing commits.
- Stage only intended changes; review `git status` + `git diff` before committing.

## Things agents must NOT change

- `index.js` entry ordering (`backgroundTask.js` before `expo-router/entry`).
- The `TaskManager.defineTask` call location (`src/services/schedular/backgroundTask.js`).
- `rotationInFlight` concurrency guard in `rotation.js`.
- The `MIN_INTERVAL_MINUTES = 1` constant and the user-interval pass-through.
- `shouldRotate()` elapsed-time gate.
- The wallpaper generator (`src/services/wallpaper/generator.js`) unless required.
- The native wallpaper module (`modules/wallpaper-manager/`) unless required.
- Do not introduce a new framework, migrate to a different architecture, or move
  files for cosmetic reasons.
