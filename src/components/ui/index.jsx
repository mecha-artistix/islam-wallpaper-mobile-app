import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, radii, type } from "../../theme";

// ─── Button ───────────────────────────────────────────────────────────────────
// Variants:
//   primary  — gold fill, dark text. The single most important action on screen.
//   soft     — gold-tinted fill, gold text. Secondary actions.
//   ghost    — text only. Tertiary actions.
//   danger   — soft red. Destructive.
// Sizes: md (default), lg (primary on-screen action).
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  labelStyle,
}) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const isDisabled = disabled || loading;
  const variantStyle =
    variant === "primary" ? s.primary
    : variant === "soft" ? s.soft
    : variant === "danger" ? s.danger
    : s.ghost;
  const labelColor =
    variant === "primary" ? theme.onAccent
    : variant === "soft" ? theme.accent
    : variant === "danger" ? theme.danger
    : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        size === "lg" ? s.lg : s.md,
        variantStyle,
        pressed && s.pressed,
        isDisabled && s.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <View style={s.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={labelColor} style={s.icon} /> : null}
          <Text style={[s.label, { color: labelColor }, labelStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Card / Section ───────────────────────────────────────────────────────────
// A subtle surface container. Avoid stacking too many — the brief asks for
// minimal cards. Use mostly for grouped settings rows.
export function Card({ children, style }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.textSecondary,
        fontSize: type.caption,
        fontWeight: "600",
        letterSpacing: 0.4,
        textTransform: "uppercase",
        marginLeft: spacing.md,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
      }}
    >
      {children}
    </Text>
  );
}

// A single settings row: leading text block + trailing control or chevron.
export function Row({ title, subtitle, trailing, onPress, destructive = false, showChevron = false }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const inner = (
    <View style={s.row}>
      <View style={s.rowText}>
        <Text style={[s.rowTitle, destructive && { color: theme.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.rowTrailing}>
        {trailing}
        {showChevron ? <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} /> : null}
      </View>
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.rowPress, pressed && s.rowPressed]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={s.rowPress}>{inner}</View>;
}

// ─── Controls ─────────────────────────────────────────────────────────────────
// Segmented control (small, calm). options: [{id,label}] → value=id
export function Segmented({ options, value, onChange }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.segmentWrap}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={({ pressed }) => [s.segment, active && s.segmentActive, pressed && s.segmentPressed]}
          >
            <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Color swatch picker. colors: ["#FFFFFF", ...], value: "#FFFFFF"
export function SwatchPicker({ colors, value, onChange }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.swatches}>
      {colors.map((c) => {
        const active = c.toLowerCase() === (value || "").toLowerCase();
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={({ pressed }) => [
              s.swatch,
              { backgroundColor: c },
              active && s.swatchActive,
              pressed && s.swatchPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Color ${c}`}
          />
        );
      })}
    </View>
  );
}

// A settings row wrapping a Switch.
export function SwitchRow({ title, subtitle, value, onValueChange }) {
  const theme = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.surfaceAlt, true: theme.accent }}
          thumbColor="#FFFFFF"
        />
      }
    />
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────
export function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
  secureTextEntry,
  onSubmitEditing,
  returnKeyType,
  style,
}) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.field}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View style={[s.inputWrap, error && s.inputWrapError]}>
        <TextInput
          style={[s.input, style]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || theme.textTertiary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginVertical: 0 }} />;
}

// ─── Pill (status chip) ────────────────────────────────────────────────────────
export function Pill({ children, tone = "neutral" }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const toneStyle =
    tone === "gold" ? s.pillGold
    : tone === "success" ? s.pillSuccess
    : tone === "muted" ? s.pillMuted
    : s.pillNeutral;
  return (
    <View style={[s.pill, toneStyle]}>
      <Text style={[s.pillText, toneStyle]}>{children}</Text>
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const makeStyles = (theme) =>
  StyleSheet.create({
    // Button
    base: {
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    md: { paddingVertical: 12, paddingHorizontal: 18 },
    lg: { paddingVertical: 16, paddingHorizontal: 22 },
    primary: { backgroundColor: theme.accent },
    soft: { backgroundColor: theme.accentSoft },
    ghost: { backgroundColor: "transparent" },
    danger: { backgroundColor: theme.dangerBg, borderWidth: 1, borderColor: theme.dangerBorder },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.4 },
    btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    icon: { marginRight: 8 },
    label: { fontSize: type.body, fontWeight: "600", letterSpacing: 0.2 },

    // Card
    card: {
      backgroundColor: theme.surface,
      borderRadius: radii.lg,
      overflow: "hidden",
    },
    rowPress: {
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
    },
    rowPressed: { opacity: 0.6 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    rowText: { flex: 1 },
    rowTitle: { color: theme.text, fontSize: type.body, fontWeight: "500" },
    rowSubtitle: { color: theme.textSecondary, fontSize: type.caption, marginTop: 2 },
    rowTrailing: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

    // Segmented
    segmentWrap: {
      flexDirection: "row",
      backgroundColor: theme.surfaceAlt,
      borderRadius: radii.md,
      padding: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.sm,
    },
    segmentActive: { backgroundColor: theme.surface },
    segmentPressed: { opacity: 0.7 },
    segmentLabel: { color: theme.textSecondary, fontSize: type.caption, fontWeight: "600" },
    segmentLabelActive: { color: theme.text },

    // Swatches
    swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    swatchActive: {
      borderColor: theme.accent,
      borderWidth: 2,
    },
    swatchPressed: { opacity: 0.7 },

    // Input
    field: { marginBottom: spacing.lg },
    fieldLabel: {
      color: theme.textSecondary,
      fontSize: type.caption,
      fontWeight: "600",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    inputWrap: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: "transparent",
    },
    inputWrapError: { borderColor: theme.danger },
    input: {
      color: theme.text,
      fontSize: type.body,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
    },
    fieldError: { color: theme.danger, fontSize: type.caption, marginTop: spacing.xs, marginLeft: spacing.sm },

    // Pill
    pill: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: radii.pill,
    },
    pillText: { fontSize: type.micro, fontWeight: "600", letterSpacing: 0.3 },
    pillGold: { backgroundColor: theme.accentSoft },
    pillSuccess: { backgroundColor: "rgba(143, 174, 110, 0.16)" },
    pillMuted: { backgroundColor: theme.surfaceAlt },
    pillNeutral: { backgroundColor: theme.surfaceAlt },
  });

export { useTheme };
