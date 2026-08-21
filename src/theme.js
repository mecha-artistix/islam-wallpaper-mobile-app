import { useColorScheme } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Design system — "Asma"
// A calm, minimal, dark-first Islamic wallpaper app. The aesthetic is built
// from typography and spacing, not decoration: near-black backgrounds, warm
// off-white/cream text, a single muted gold accent. No crescents, no mosque
// patterns, no gradients in the app UI (gradients exist only inside the
// generated wallpaper itself).
//
// The palette is warm-neutral: the near-black has a faint warm undertone so it
// never reads as cold blue/grey "developer dark". Cream text reduces glare vs.
// pure white. Gold is desaturated so it feels like leaf/parchment, not bright.
// ─────────────────────────────────────────────────────────────────────────────

// Spacing scale (4-step base). Used everywhere for consistent rhythm.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Radii.
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

// Typography scale. Display sizes are for hero Arabic / large headlines.
export const type = {
  // Arabic — large, beautiful, the visual anchor of most screens.
  arabicHero: 64,
  arabicLarge: 48,
  arabicMedium: 34,
  // Latin
  display: 28,
  title: 22,
  subtitle: 17,
  body: 16,
  caption: 13,
  micro: 11,
};

// The palette. `dark` is the primary, designed-first mode. `light` is provided
// for users on light system theme but stays warm and cream-based.
const PALETTES = {
  dark: {
    bg: "#0B0B0D", // near-black, faint warm undertone
    surface: "#141417", // cards / elevated surfaces
    surfaceAlt: "#1C1C20", // inputs / nested surfaces
    overlay: "rgba(11, 11, 13, 0.72)", // scrim behind modals
    text: "#F3EDE0", // warm off-white / cream
    textSecondary: "#A39B8C", // muted warm grey
    textTertiary: "#6B655C", // faintest
    accent: "#C9A24B", // muted gold
    accentStrong: "#D9B25E", // hover/press gold
    accentSoft: "rgba(201, 162, 75, 0.14)", // gold tint background
    onAccent: "#1A1408", // dark text on a gold button
    divider: "rgba(243, 237, 224, 0.08)",
    border: "rgba(243, 237, 224, 0.10)",
    inputBorder: "rgba(243, 237, 224, 0.14)",
    success: "#8FAE6E",
    danger: "#C75D5D",
    dangerBg: "rgba(199, 93, 93, 0.10)",
    dangerBorder: "rgba(199, 93, 93, 0.28)",
    // tab bar
    tabBar: "#0E0E11",
    tabBarBorder: "rgba(243, 237, 224, 0.06)",
    // status bar
    statusBar: "light",
  },
  light: {
    bg: "#F4EFE6", // warm cream
    surface: "#FFFFFF",
    surfaceAlt: "#EFE9DD",
    overlay: "rgba(244, 239, 230, 0.80)",
    text: "#211C16", // warm near-black
    textSecondary: "#6B6457",
    textTertiary: "#9A9388",
    accent: "#9A7530", // deeper gold for contrast on cream
    accentStrong: "#7E5E22",
    accentSoft: "rgba(154, 117, 48, 0.12)",
    onAccent: "#FFFFFF",
    divider: "rgba(33, 28, 22, 0.08)",
    border: "rgba(33, 28, 22, 0.10)",
    inputBorder: "rgba(33, 28, 22, 0.14)",
    success: "#5E8A3A",
    danger: "#B0413E",
    dangerBg: "rgba(176, 65, 62, 0.08)",
    dangerBorder: "rgba(176, 65, 62, 0.24)",
    tabBar: "#FBF7F0",
    tabBarBorder: "rgba(33, 28, 22, 0.06)",
    statusBar: "dark",
  },
};

export function useTheme() {
  const scheme = useColorScheme();
  return PALETTES[scheme === "light" ? "light" : "dark"];
}

// Raw palette access for non-hook contexts (services, native config).
export const PALETTE = PALETTES;
