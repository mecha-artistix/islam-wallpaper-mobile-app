# Onboarding & Profile

## Purpose

First-launch welcome screen (optional name/email) + the profile editor.
Both are optional — the app works fully without them. Local-only storage.

## Relevant files

- `src/app/onboarding.jsx` — first-launch screen.
- `src/app/profile.jsx` — profile editor (reachable from Settings).
- `src/app/(tabs)/index.jsx` — hosts the onboarding gate (redirects to `/onboarding` if not completed, under the splash so no flicker).
- Accessors in `src/services/preferences.js`:
  - `getOnboardingCompleted()` / `setOnboardingCompleted(value)`.
  - `getProfile()` → `{ name, email }` (both `null` when not set).
  - `setProfile({ name, email })` — trims, blank → `null`, deletes the key.
  - `isValidEmail(email)` — `true` for empty; `^[^\s@]+@[^\s@]+\.[^\s@]+$` otherwise.

## Main components / functions

- `OnboardingScreen` (`onboarding.jsx`):
  - Fields: Name (default keyboard), Email (email keyboard, no autocapitalize).
  - Inline email validation (`showEmailError` only after touch + non-empty + invalid) — **never blocks**.
  - `Continue` (saves profile) and a clearly visible `Skip` (no save).
  - On either: `setOnboardingCompleted(true)` + `registerWallpaperScheduler()` + `router.replace("/")`.
  - Safety: if already completed (e.g. deep link), redirects to `/`.
- `ProfileScreen` (`profile.jsx`):
  - Same fields + `Save` (writes profile) + `Clear profile` (nulls both).

## Data flow

```
Home mount
  → getOnboardingCompleted()
  → if false: router.replace("/onboarding") [splash still up]
onboarding Continue/Skip
  → setProfile({ name, email }) [if Continue]
  → setOnboardingCompleted(true)
  → registerWallpaperScheduler()
  → router.replace("/")
```

## State / preferences

- `onboarding_completed` (bool) — shown once, then never.
- `user_name`, `user_email` (string | null) — optional.

## Important constraints

- **Never make name/email mandatory.** Skip must work fully; the app must function with both `null`.
- **Email validation is feedback only.** An invalid email is ignored (not stored), never blocks entry. `isValidEmail("") === true`.
- **Keyboard must not cover Continue/Skip.** Uses `KeyboardAvoidingView` (iOS `padding` behavior).
- **No backend.** Profile is local. Accessors structured so a backend could replace them later.

## External dependencies

- None beyond React Native + expo-router.

## Related features

- **preferences** — onboarding flag + profile accessors.
- **scheduling** — onboarding registers the scheduler on first run.
- **settings-ui** — Settings links to `/profile`.

## Known bugs / issues

- None known.
