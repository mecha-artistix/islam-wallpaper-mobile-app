import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
  setProfile,
  isValidEmail,
} from "../services/preferences";
import { Button, TextInputField } from "../components/ui";
import { useTheme, spacing, radii, type } from "../theme";
import { registerWallpaperScheduler } from "../services/schedular/schedular";

// First-launch onboarding. Asks for an optional Name + Email. Both are
// optional and there's a clearly visible Skip — this must NOT feel like
// mandatory account registration. The app works fully without them.
//
// On Continue or Skip: mark onboarding complete (so this never shows again)
// and enter the app. Profile can later be edited from Settings.
export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = makeStyles(theme);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);

  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid && email.length > 0;

  // Safety: if onboarding was already completed (e.g. deep link straight here),
  // bounce to the app.
  useEffect(() => {
    (async () => {
      const done = await getOnboardingCompleted();
      if (done) router.replace("/");
      SplashScreen.hideAsync();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(skipped) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!skipped) {
        // Save whatever was provided. Email is validated for feedback only;
        // an invalid email is simply ignored (not stored), never blocks entry.
        const emailToSave = emailValid ? email : null;
        await setProfile({ name, email: emailToSave });
      }
      await setOnboardingCompleted(true);
      // Ensure the background rotation scheduler is registered on first run.
      await registerWallpaperScheduler();
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  }

  function onContinue() {
    Keyboard.dismiss();
    finish(false);
  }
  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Text style={s.logoArabic}>بسم الله</Text>
          </View>
          <Text style={s.title}>Discover the Names of Allah</Text>
          <Text style={s.subtitle}>
            Bring a beautiful reminder to your everyday screen.
          </Text>
        </View>

        <View style={s.form}>
          <TextInputField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
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
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Button label="Continue" onPress={onContinue} size="lg" loading={submitting} style={s.continue} />
          <Pressable onPress={() => finish(true)} hitSlop={12} style={s.skipWrap}>
            <Text style={s.skip}>Skip</Text>
          </Pressable>
        </View>

        <Text style={s.footnote}>
          Optional — used only to personalize your experience. You can change this anytime in Settings.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxxl + 24,
      paddingBottom: spacing.xxl,
    },
    hero: { alignItems: "center", marginBottom: spacing.xxxl },
    logoMark: {
      width: 96,
      height: 96,
      borderRadius: radii.pill,
      backgroundColor: theme.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xl,
    },
    logoArabic: {
      color: theme.accent,
      fontFamily: "NotoNaskhArabic",
      fontSize: 26,
    },
    title: {
      color: theme.text,
      fontSize: type.display,
      fontWeight: "600",
      textAlign: "center",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: type.body,
      textAlign: "center",
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    form: { width: "100%", maxWidth: 460, alignSelf: "center" },
    continue: { marginTop: spacing.sm },
    skipWrap: { alignSelf: "center", marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    skip: {
      color: theme.textSecondary,
      fontSize: type.body,
      fontWeight: "500",
    },
    footnote: {
      color: theme.textTertiary,
      fontSize: type.caption,
      textAlign: "center",
      marginTop: spacing.xxl,
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
