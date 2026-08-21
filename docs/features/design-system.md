# Design system

## Purpose

The visual language: colors, typography, spacing, radii, and the shared UI
primitives. Dark-first, calm, Islamic aesthetic via typography + spacing (no
crescents/mosque motifs, no decorative gradients in the app UI).

## Relevant files

- `src/theme.js` — `useTheme()`, `PALETTE`, `spacing`, `radii`, `type`.
- `src/components/ui/index.jsx` — `Button`, `Card`, `Row`, `SectionLabel`, `Segmented`, `SwatchPicker`, `SwitchRow`, `TextInputField`, `Pill`, `Divider`.
- `src/components/ui/Screen.jsx` — `Screen`, `ScreenLoading` (thin scaffolds).

## Palette (dark, primary)

- `bg` `#0B0B0D` — near-black, faint warm undertone.
- `surface` `#141417` — cards / elevated surfaces.
- `surfaceAlt` `#1C1C20` — inputs / nested surfaces.
- `text` `#F3EDE0` — warm off-white / cream.
- `textSecondary` `#A39B8C`, `textTertiary` `#6B655C`.
- `accent` `#C9A24B` — muted gold; `accentSoft` 14% gold tint.
- `danger` `#C75D5D`; `success` `#8FAE6E`.

A `light` palette exists (warm cream-based) for the system light theme; `useTheme()`
picks based on `useColorScheme()`. `app.json` sets `userInterfaceStyle: "automatic"`.

## Typography scale (`type`)

- `arabicHero` 64, `arabicLarge` 48, `arabicMedium` 34 — for large Arabic text.
- `display` 28, `title` 22, `subtitle` 17, `body` 16, `caption` 13, `micro` 11 — Latin.

Arabic text uses `fontFamily: "NotoNaskhArabic"` (loaded via `expo-font` through `EXPO_FONTS` in `src/services/wallpaper/fonts.js`).

## Spacing / radii

- `spacing`: xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48.
- `radii`: sm 8 · md 12 · lg 16 · xl 20 · pill 999.

## Shared components

- `Button` — variants: `primary` (gold), `soft` (gold tint), `ghost`, `danger`; sizes `md`/`lg`; `loading`/`disabled` states.
- `Card` — subtle surface container (use sparingly; the brief avoids excessive cards).
- `Row` — settings row with title/subtitle + trailing control or chevron.
- `Segmented`, `SwatchPicker`, `SwitchRow`, `TextInputField`, `Pill`, `Divider`.

## Important constraints

- **Use theme tokens, never raw hex colors** in components. This keeps light/dark consistent.
- **No indigo/blue, no decorative gradients** in the app UI. (Gradients exist only inside the generated wallpaper.)
- **Minimal borders** — prefer spacing + subtle surface contrast over heavy dividers.
- **Wallpaper preview is always the visual hero** on Home/Detail — don't crowd it.

## External dependencies

- `react-native` (`useColorScheme`, `StyleSheet`).
- `@expo/vector-icons` (`Ionicons`) for icons (neutral geometric — no crescent/mosque).

## Related features

- Used by **app-ui** and **settings-ui** everywhere.
- Independent of services (leaf, no business logic).

## Known bugs / issues

- None known.
