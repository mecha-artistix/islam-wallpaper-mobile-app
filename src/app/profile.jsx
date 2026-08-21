import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getProfile, setProfile, isValidEmail } from "../services/preferences";
import { Button, Card, TextInputField } from "../components/ui";
import { useTheme, spacing, type, layout } from "../theme";

// Edit profile — name and email are always optional. Both can be cleared.
// Same shape as onboarding but reachable from Settings, so users who skipped
// onboarding can add their info later (or vice versa).
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setName(p.name || "");
      setEmail(p.email || "");
      setLoaded(true);
    })();
  }, []);

  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid && email.length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      // Invalid email is ignored (not stored) rather than blocking — email is
      // optional. The inline error already guides the user.
      const emailToSave = emailValid ? email : null;
      await setProfile({ name, email: emailToSave });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await setProfile({ name: null, email: null });
      setName("");
      setEmail("");
      setEmailTouched(false);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <View style={s.loading} />;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: layout.scrollBottomPushed + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* TextInputField renders its own label + input; wrap in Card for the
            elevated surface look consistent with the rest of Settings. */}
        <Card style={s.fieldCard}>
          <TextInputField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            returnKeyType="next"
          />
        </Card>
        <Card style={s.fieldCard}>
          <TextInputField
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (!emailTouched) setEmailTouched(true);
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={showEmailError ? "Please enter a valid email, or leave it blank." : undefined}
            returnKeyType="done"
          />
        </Card>

        <View style={s.actions}>
          <Button label="Save" onPress={handleSave} size="lg" loading={saving} />
          <Button label="Clear profile" onPress={handleClear} variant="ghost" size="md" />
        </View>

        <Text style={s.footnote}>
          Optional — used only to personalize your experience. Stored on this device only.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    loading: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing.lg },
    fieldCard: { padding: spacing.lg, marginBottom: spacing.md },
    actions: { marginTop: spacing.lg, gap: spacing.sm },
    footnote: {
      color: theme.textTertiary,
      fontSize: type.caption,
      marginTop: spacing.lg,
      lineHeight: 18,
      paddingHorizontal: spacing.sm,
    },
  });
