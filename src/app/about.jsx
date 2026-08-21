import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, spacing, radii, type } from "../theme";
import { Card, SectionLabel, Row } from "../components/ui";

// About — a calm, simple page. Includes the app purpose, a short privacy note,
// and the version. The activity log (diagnostics) is reachable only via a
// long-press on the "About this app" row — invisible to a casual user.
export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Text style={s.logoArabic}>بسم الله</Text>
          </View>
          <Text style={s.appName}>Asma</Text>
          <Text style={s.tagline}>The 99 Names of Allah, on your screen.</Text>
        </View>

        <SectionLabel>About</SectionLabel>
        <Card>
          {/* Long-press here opens the activity log (hidden diagnostics entry). */}
          <Pressable
            onLongPress={() => router.push("/logs")}
            delayLongPress={600}
          >
            <Text style={s.body}>
              Asma brings the 99 Names of Allah (Asma ul Husna) to your device wallpaper. Set it once, and let the app quietly bring a new Name to your screen on a schedule you choose.
            </Text>
          </Pressable>
        </Card>

        <SectionLabel>Privacy</SectionLabel>
        <Card>
          <Text style={s.body}>
            Your name and email (if provided) are stored only on this device. The app works fully without them. Wallpaper generation happens entirely on your device. No analytics are collected.
          </Text>
        </Card>

        <SectionLabel>Version</SectionLabel>
        <Card>
          <Row title="App version" trailing={<Text style={s.versionText}>1.0.0</Text>} />
        </Card>

        <Text style={s.footnote}>ﷺ</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 16, paddingTop: spacing.lg },
    hero: { alignItems: "center", paddingVertical: spacing.xl },
    logoMark: {
      width: 88,
      height: 88,
      borderRadius: radii.pill,
      backgroundColor: theme.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    logoArabic: {
      color: theme.accent,
      fontFamily: "NotoNaskhArabic",
      fontSize: 24,
    },
    appName: {
      color: theme.text,
      fontSize: type.display,
      fontWeight: "600",
      letterSpacing: -0.3,
    },
    tagline: {
      color: theme.textSecondary,
      fontSize: type.body,
      marginTop: spacing.xs,
      textAlign: "center",
    },
    body: {
      color: theme.textSecondary,
      fontSize: type.body,
      lineHeight: 24,
      padding: spacing.lg,
    },
    versionText: { color: theme.textSecondary, fontSize: type.body },
    footnote: {
      color: theme.textTertiary,
      fontSize: type.arabicMedium,
      textAlign: "center",
      marginTop: spacing.xxl,
    },
  });
