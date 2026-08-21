import { StyleSheet, Text, View } from "react-native";
import { useTheme, spacing, radii } from "../../theme";

// A reusable page scaffold: warm near-black background, safe-area aware,
// consistent horizontal padding. Use <Screen> as the root of every screen body.
export function Screen({ children, style, ...props }) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }, style]} {...props}>
      {children}
    </View>
  );
}

// A centered full-screen loading state.
export function ScreenLoading({ label = "Loading" }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <Text style={{ color: theme.textSecondary, fontSize: 15 }}>{label}…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export { spacing, radii };
