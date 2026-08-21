import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, layout } from "../../theme";

// SafeScreen — the standard screen scaffold. Handles:
//   - top + bottom safe-area insets (so content is never behind the status bar,
//     notch, or Android gesture/button nav bar)
//   - consistent horizontal padding (layout.screenPaddingH)
//   - consistent bottom padding that clears the tab bar (tab screens) or the
//     nav bar (pushed screens)
//
// Use <SafeScreen> as the root of every screen body instead of a raw SafeAreaView
// + ScrollView, so spacing is consistent and one tweak in theme.js ripples
// everywhere.
//
// Props:
//   tab        — true if this is a bottom-tab screen (adds tab-bar bottom padding)
//   scroll     — true (default) to render a ScrollView; false for a static View
//   edges      — safe-area edges; default ["top","bottom"] for pushed screens,
//                ["top"] for tab screens (the tab bar handles its own bottom)
//   contentStyle / style — overrides
export function SafeScreen({
  children,
  tab = false,
  scroll = true,
  edges,
  contentStyle,
  style,
  ...props
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeEdges = edges ?? (tab ? ["top"] : ["top", "bottom"]);

  // Bottom padding: clear the tab bar (tab screens) or the nav bar (pushed),
  // PLUS the device's bottom safe-area inset for gesture/nav bars.
  const baseBottom = tab ? layout.scrollBottomTab : layout.scrollBottomPushed;
  const paddingBottom = baseBottom + insets.bottom;

  if (!scroll) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.bg }, style]}
        edges={safeEdges}
        {...props}
      >
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }, style]}
      edges={safeEdges}
      {...props}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.screenPaddingH, paddingBottom },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// A header block with consistent top padding (for screens with a title above
// their scroll content, e.g. Names, Settings).
export function ScreenHeader({ title, subtitle, right }) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { paddingTop: layout.sectionGap, marginBottom: 12 },
        title: { color: theme.text, fontSize: 21, fontWeight: "600", letterSpacing: -0.3 },
        subtitle: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
        row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
      }),
    [theme]
  );
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
});
