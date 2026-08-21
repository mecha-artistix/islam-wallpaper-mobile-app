import { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  BUILT_IN_PRESETS,
  ARABIC_FONTS,
  COLOR_SWATCHES,
  ALIGNMENTS,
  DEFAULT_WALLPAPER_SETTINGS,
  mergeSettings,
} from "../services/wallpaper/settings";
import {
  getWallpaperSettings,
  setWallpaperSettings,
} from "../services/preferences";
import { ASMA_UL_HUSNA } from "../data/asmaUlHusna";
import { Button, Card, SectionLabel, Segmented, SwatchPicker } from "../components/ui";
import WallpaperPreview from "../components/editor/WallpaperPreview";
import { clearWallpaperPreviewCache } from "../components/WallpaperPreviewImage";
import { useTheme, spacing, radii, type } from "../theme";

// Simple wallpaper customization — NOT a Figma-like editor. A calm settings
// screen with a live preview at the top and a few controls below:
//   - Style presets (the built-in themes)
//   - Arabic font family
//   - Arabic font size
//   - Text color (Arabic)
//   - Text position (align)
//
// All controls read/write the existing wallpaperSettings object (the single
// source of truth consumed by the generator), so no generator changes are
// needed. Presets apply a whole settings object; the fine-tuning controls then
// edit individual fields on top of the current settings.
export default function CustomizeScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const { id } = useLocalSearchParams();

  // The name shown in the live preview. Defaults to the first name if none
  // provided (e.g. when opened from Settings rather than a detail screen).
  const previewName = useMemo(() => {
    const num = parseInt(Array.isArray(id) ? id[0] : id, 10);
    return ASMA_UL_HUSNA.find((n) => n.number === num) || ASMA_UL_HUSNA[0];
  }, [id]);

  const [settings, setSettings] = useState(DEFAULT_WALLPAPER_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getWallpaperSettings();
      setSettings(mergeSettings(saved));
      setLoaded(true);
    })();
  }, []);

  // Mutate a single path in the settings object (immutable). Supports one or
  // two levels: setField("arabic", "fontSize", 140) or
  // setField("background", "gradient", "startColor", "#000").
  function setField(...path) {
    const value = path[path.length - 1];
    const keys = path.slice(0, -1);
    setSettings((prev) => {
      const next = structuredCloneShallow(prev);
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  }

  function applyPreset(presetSettings) {
    setSettings(mergeSettings(presetSettings));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setWallpaperSettings(settings);
      // Invalidate any cached generated PNG for this name so the next preview
      // regenerates with the new appearance.
      clearWallpaperPreviewCache(previewName.number);
      setDirty(false);
      Alert.alert("Saved", "Your wallpaper appearance has been updated.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <View style={s.loading} />;

  const arabic = settings.arabic;
  const layout = settings.layout;
  const previewWidth = Math.min(Dimensions.get("window").width - spacing.xl * 2, 340);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Live preview — uses the existing WallpaperPreview (maps settings →
          RN/Skia without regenerating a PNG, so it stays fast). It expects
          { ism, settings, width } and derives height from width. */}
      <View style={s.previewWrap}>
        <WallpaperPreview ism={previewName} settings={settings} width={previewWidth} />
      </View>

      {/* Style presets */}
      <SectionLabel>Style</SectionLabel>
      <View style={s.presets}>
        {BUILT_IN_PRESETS.map((p) => {
          const active = isSamePreset(settings, p.settings);
          return (
            <PresetChip key={p.name} label={p.name} active={active} onPress={() => applyPreset(p.settings)} />
          );
        })}
      </View>

      {/* Arabic font */}
      <SectionLabel>Arabic font</SectionLabel>
      <Card>
        <Segmented
          options={ARABIC_FONTS}
          value={arabic.fontFamily}
          onChange={(v) => setField("arabic", "fontFamily", v)}
        />
      </Card>

      {/* Arabic size */}
      <SectionLabel>Arabic size</SectionLabel>
      <Card>
        <SizeStepper
          value={arabic.fontSize}
          min={80}
          max={180}
          step={10}
          onChange={(v) => setField("arabic", "fontSize", v)}
        />
      </Card>

      {/* Text color */}
      <SectionLabel>Text color</SectionLabel>
      <Card>
        <SwatchPicker colors={COLOR_SWATCHES} value={arabic.color} onChange={(v) => setField("arabic", "color", v)} />
      </Card>

      {/* Text position */}
      <SectionLabel>Text position</SectionLabel>
      <Card>
        <Segmented options={ALIGNMENTS} value={layout.align} onChange={(v) => setField("layout", "align", v)} />
      </Card>

      <View style={s.actions}>
        <Button
          label={dirty ? "Save changes" : "Saved"}
          onPress={handleSave}
          size="lg"
          loading={saving}
          disabled={!dirty}
          icon="checkmark"
        />
      </View>
    </ScrollView>
  );
}

// A minimal +/- stepper for font size — simpler and calmer than a slider for a
// small number of fixed-ish steps, and easier to use one-handed.
function SizeStepper({ value, min, max, step, onChange }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={s.stepperRow}>
      <StepperButton icon="remove" onPress={dec} disabled={value <= min} />
      <Text style={s.stepperValue}>{value}</Text>
      <StepperButton icon="add" onPress={inc} disabled={value >= max} />
    </View>
  );
}

function StepperButton({ icon, onPress, disabled }) {
  const theme = useTheme();
  return (
    <PressableStepper icon={icon} onPress={onPress} disabled={disabled} theme={theme} />
  );
}

function PressableStepper({ icon, onPress, disabled, theme }) {
  const s = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.stepperBtn, pressed && s.stepperPressed, disabled && s.stepperDisabled]}
    >
      <Ionicons name={icon} size={18} color={disabled ? theme.textTertiary : theme.text} />
    </Pressable>
  );
}

// re-using the segmented look for preset chips
function PresetChip({ label, active, onPress }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        active && s.chipActive,
        pressed && s.chipPressed,
      ]}
    >
      <Text style={[s.chipLabel, active && s.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
// Shallow-enough deep clone for the settings object (two levels deep max).
function structuredCloneShallow(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = { ...out[k] };
      for (const sk of Object.keys(out[k])) {
        if (out[k][sk] && typeof out[k][sk] === "object" && !Array.isArray(out[k][sk])) {
          out[k][sk] = { ...out[k][sk] };
        }
      }
    }
  }
  return out;
}

// Approx equality for highlighting the active preset (compares the fields a
// preset actually overrides). Good enough for UI feedback.
function isSamePreset(current, preset) {
  const keys = ["background", "arabic", "transliteration", "translation", "meaning", "numberBadge", "layout"];
  for (const k of keys) {
    const c = current[k];
    const p = preset[k];
    if (!p) continue;
    const pKeys = Object.keys(p);
    for (const pk of pKeys) {
      const cv = c && c[pk];
      const pv = p[pk];
      if (pv && typeof pv === "object") {
        for (const ppk of Object.keys(pv)) {
          if (cv && cv[ppk] !== pv[ppk] && pv[ppk] !== undefined) return false;
        }
      } else if (cv !== pv && pv !== undefined) {
        return false;
      }
    }
  }
  return true;
}

const makeStyles = (theme) =>
  StyleSheet.create({
    loading: { flex: 1, backgroundColor: theme.bg },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 16, paddingTop: spacing.lg },
    previewWrap: {
      alignSelf: "center",
      marginBottom: spacing.sm,
    },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: "transparent",
    },
    chipActive: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
    chipPressed: { opacity: 0.7 },
    chipLabel: { color: theme.textSecondary, fontSize: type.caption, fontWeight: "600" },
    chipLabelActive: { color: theme.accent },
    stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: spacing.sm },
    stepperValue: { color: theme.text, fontSize: type.subtitle, fontWeight: "600", fontVariant: ["tabular-nums"] },
    stepperBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: theme.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperPressed: { opacity: 0.6 },
    stepperDisabled: { opacity: 0.3 },
    actions: { marginTop: spacing.xl, marginBottom: spacing.lg },
  });
