import { useColorScheme } from "react-native";

// App-wide minimalist palette. Follows the system theme
// (app.json userInterfaceStyle: "automatic").
const PALETTES = {
  dark: {
    bg: "#111111",
    card: "#1c1c1e",
    cardAlt: "#2a2a2a",
    text: "#ffffff",
    textSecondary: "#888888",
    border: "#2a2a2a",
    inputBorder: "#444444",
    accent: "#ff8c00",
    accentSoft: "rgba(255, 140, 0, 0.12)",
    onAccent: "#ffffff",
    danger: "#ff6b6b",
    dangerBg: "#2a1a1a",
    dangerBorder: "#5a2a2a",
  },
  light: {
    bg: "#f5f5f5",
    card: "#ffffff",
    cardAlt: "#eeeeee",
    text: "#111111",
    textSecondary: "#666666",
    border: "#e5e5e5",
    inputBorder: "#dddddd",
    accent: "#ff8c00",
    accentSoft: "rgba(255, 140, 0, 0.12)",
    onAccent: "#ffffff",
    danger: "#cc0000",
    dangerBg: "#fff0f0",
    dangerBorder: "#ffcccc",
  },
};

export function useTheme() {
  const scheme = useColorScheme();
  return PALETTES[scheme === "light" ? "light" : "dark"];
}
