# Google Play Store Publishing Plan

Goal: publish the Asma ul Husna dynamic wallpaper app to the Google Play Store (Android only).

## Current State (audit)

Already in place:
- EAS project linked (`extra.eas.projectId`) and `eas.json` with `development` / `preview` / `production` profiles; `appVersionSource: "remote"` + `autoIncrement` on production.
- `expo-background-task`, `expo-secure-store`, dev-client workflow all working.
- App is functionally complete: browsing, manual set, customization editor, auto-rotation.

Must change before release (details below):
- App name is `dynamic-wallpaper-app`, package is `com.anonymous.dynamicwallpaperapp` — neither is publishable.
- All icons/splash are Expo template defaults (expo-logo, react-logo assets are still in `assets/images/`).
- Splash background is `#208AEF` (template blue), not brand.
- No privacy policy, no store listing assets.

## Phase 1 — Identity & Config (code changes)

- [x] Decide final app name — **"Daily Islamic Wallpapers"**.
- [x] Decide final package name — `com.mecha.dailyislamicwallpapers`. **Permanent once uploaded — cannot be changed later.**
- [x] Update `app.json`: `name`, `slug` (`daily-islamic-wallpapers`), `android.package`, splash `backgroundColor` `#111111`.
- [ ] Remove unused template image assets (expo-logo, react-logo, tutorial-web, etc.) from `assets/images/` before release.
- [x] Verify permissions: only `SET_WALLPAPER` — good for a wallpaper app; nothing else to declare.
- [x] Keep `version: "1.0.0"`; EAS remote versioning handles `versionCode` increments.

## Phase 2 — Visual Assets (design work)

App assets (replace files in `assets/images/`):
- [x] App icon (`icon.png`) + adaptive layers (`icon_foreground.png`, `icon_background.png`, `icon_monochrome.png`) — wired in `app.json`, `adaptiveIcon.backgroundColor` `#111111`.
- [x] Splash icon (`splash-icon.png`) — الله mark on `#111111`.

Play Console assets (not in repo):
- [ ] Hi-res icon 512×512 PNG.
- [ ] Feature graphic 1024×500 JPG/PNG.
- [ ] Minimum 2 phone screenshots (1080×1920 works — the app itself generates that size; capture: home list, editor, a generated wallpaper on the home screen).

## Phase 3 — Google Accounts & Legal

- [ ] Google Play Developer account ($25 one-time) — if not already created.
- [ ] Privacy policy URL (required even though the app collects nothing — a simple hosted page stating "no data collected, no accounts, no tracking"; GitHub Pages / Notion / etc. works).
- [ ] Decide contact email for the store listing (public).

## Phase 4 — Build & Smoke Test

- [ ] Preview build first: `eas build --platform android --profile preview` → install APK on a real device.
- [ ] Smoke-test on the release build (dev-client hides issues): name cards → detail → set wallpaper, editor (all sections, presets, reset), rotation (toggle + interval + Rotate Now), system dark/light theme switch, fresh-install first-launch.
- [ ] Production build: `eas build --platform android --profile production` → `.aab`.
- [ ] App signing: let **Google Play App Signing** manage the release key; EAS keeps the upload keystore (already default).

## Phase 5 — Play Console Setup

- [ ] Create app → name, default language, free, declarations.
- [ ] Store listing: short description (80 chars), full description, category **Personalization**, tags: wallpaper.
- [ ] Upload graphic assets from Phase 2.
- [ ] Content rating questionnaire (IARC) → expect "Everyone".
- [ ] Data safety form: **no data collected or shared** (verify: app has no network calls, no analytics, no ads).
- [ ] Target audience: 18+ general (avoid "children" to skip Families policy).
- [ ] Privacy policy URL from Phase 3.

## Phase 6 — Testing Track (required)

New personal developer accounts must complete a **closed test with 12 testers for 14 days** before production access is granted.
- [ ] Create closed testing track, upload the production AAB.
- [ ] Recruit 12 testers (friends/family/communities), share opt-in link.
- [ ] Fix anything reported during the 14 days; push new builds with `eas build` (autoIncrement bumps versionCode).

## Phase 7 — Production Release

- [ ] Promote the tested release to production (or upload fresh AAB).
- [ ] Review rollout — start with a **staged rollout** (e.g. 20%) if offered, or full release.
- [ ] First submission review typically takes 3–7 days.

## Phase 8 — Future Updates

- Version bump flow: change `version` in `app.json` for user-facing version; `eas build --profile production` auto-increments versionCode; promote through Play Console.
- Consider `eas submit --platform android` automation later (needs a Google Play service account JSON key; first upload is usually manual).

## Open Decisions (need answers before Phase 1)

1. Final app name and package name?
2. Do you have a Google Play Developer account already?
3. App icon design — generate a simple calligraphy-style "٩٩" / Allah-name motif, or commission one?
4. Where to host the privacy policy?
