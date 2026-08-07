import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import WallpaperPreview from "../components/editor/WallpaperPreview";
import { SliderRow, ColorRow, SegmentedRow, SwitchRow, SectionTitle } from "../components/editor/controls";
import {
  DEFAULT_WALLPAPER_SETTINGS,
  BUILT_IN_PRESETS,
  ARABIC_FONTS,
  LATIN_FONTS,
  FONT_WEIGHTS,
  ALIGNMENTS,
  mergeSettings,
} from "../services/wallpaper/settings";
import { generateWallpaperImage } from "../services/wallpaper/generator";
import { EXPO_FONTS } from "../services/wallpaper/fonts";
import { setDeviceWallpaper } from "../services/wallpaper/manager";
import {
  getWallpaperSettings,
  setWallpaperSettings,
  getWallpaperPresets,
  saveWallpaperPreset,
  deleteWallpaperPreset,
  setSelectedNameIndex,
  setLastRotation,
} from "../services/preferences";
import { ASMA_UL_HUSNA } from "../data/asmaUlHusna";
import { notifyWallpaperChanged } from "../services/notifications";
import { useTheme } from "../theme";

const { height: SCREEN_H } = Dimensions.get("window");
const BOTTOM_BAR_H = 68;
const SHEET_H = SCREEN_H * 0.8;
const SNAP_EXPANDED = 0;
const SNAP_MEDIUM = SHEET_H - SCREEN_H * 0.42;
const SNAP_COLLAPSED = SHEET_H - 132;

const SECTIONS = [
  { key: "themes", label: "Themes" },
  { key: "background", label: "Background" },
  { key: "arabic", label: "Arabic" },
  { key: "transliteration", label: "Translit." },
  { key: "translation", label: "Translation" },
  { key: "meaning", label: "Meaning" },
  { key: "numberBadge", label: "Badge" },
  { key: "layout", label: "Layout" },
  { key: "effects", label: "Effects" },
];

// Immutable set: setPath(settings, "background.gradient.startColor", "#fff")
function setPath(obj, path, value) {
  const keys = path.split(".");
  const root = { ...obj };
  let cursor = root;
  for (let i = 0; i < keys.length - 1; i++) {
    cursor[keys[i]] = { ...cursor[keys[i]] };
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  return root;
}

export default function WallpaperEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { ism: ismParam } = useLocalSearchParams();
  const ism = JSON.parse(ismParam);

  const [fontsLoaded] = useFonts(EXPO_FONTS);

  const [settings, setSettings] = useState(DEFAULT_WALLPAPER_SETTINGS);
  const [userPresets, setUserPresets] = useState([]);
  const [activeSection, setActiveSection] = useState("themes");
  const [busy, setBusy] = useState(false);
  const [presetModal, setPresetModal] = useState(false);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    (async () => {
      const [saved, presets] = await Promise.all([getWallpaperSettings(), getWallpaperPresets()]);
      setSettings(mergeSettings(saved));
      setUserPresets(presets);
    })();
  }, []);

  const update = (path, value) => setSettings((s) => setPath(s, path, value));
  const applyPreset = (presetSettings) => setSettings(mergeSettings(presetSettings));

  // ---- Draggable sheet (collapsed / medium / expanded) ----
  const translateY = useSharedValue(SNAP_MEDIUM);
  const dragStart = useSharedValue(SNAP_MEDIUM);
  const pan = Gesture.Pan()
    .onBegin(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(SNAP_EXPANDED, Math.min(SNAP_COLLAPSED, dragStart.value + e.translationY));
    })
    .onEnd(() => {
      const points = [SNAP_EXPANDED, SNAP_MEDIUM, SNAP_COLLAPSED];
      const nearest = points.reduce((a, b) => (Math.abs(b - translateY.value) < Math.abs(a - translateY.value) ? b : a));
      translateY.value = withSpring(nearest, { damping: 22, stiffness: 220 });
    });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  // The sheet is always 80% of the screen tall even when collapsed, so a
  // flex:1 controls list never overflows and can't scroll. Bound the controls
  // area to the visible window (sheet height minus how far it's dragged down,
  // minus the header) so content overflows and scrolling works at every snap.
  const headerH = useSharedValue(84);
  const controlsWrapStyle = useAnimatedStyle(() => ({
    height: Math.max(0, SHEET_H - translateY.value - headerH.value),
  }));

  // ---- Actions ----
  async function handleSetWallpaper() {
    setBusy(true);
    try {
      await setWallpaperSettings(settings);
      const uri = await generateWallpaperImage(ism, settings);
      await setDeviceWallpaper(uri);
      const index = ASMA_UL_HUSNA.findIndex((n) => n.number === ism.number);
      if (index !== -1) await setSelectedNameIndex(index);
      await setLastRotation(Date.now());
      await notifyWallpaperChanged(ism);
      Alert.alert("Success", "Wallpaper set — saved theme will also be used for rotation.");
    } catch (e) {
      Alert.alert("Error", `Failed to set wallpaper: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    const presets = await saveWallpaperPreset(name, settings);
    setUserPresets(presets);
    setPresetModal(false);
    setPresetName("");
  }

  function handleDeletePreset(name) {
    Alert.alert("Delete Preset", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => setUserPresets(await deleteWallpaperPreset(name)),
      },
    ]);
  }

  function handleReset() {
    Alert.alert("Reset", "Reset all settings to the Dark Night defaults?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => setSettings(DEFAULT_WALLPAPER_SETTINGS) },
    ]);
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const previewWidth = Math.min(Dimensions.get("window").width * 0.66, SCREEN_H * 0.5 * (9 / 16));

  return (
    <GestureHandlerRootView style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{ism.transliteration}</Text>
        <View style={styles.topButton} />
      </View>

      {/* Live preview — updates from settings only, no PNG regeneration */}
      <View style={styles.previewArea}>
        <WallpaperPreview ism={ism} settings={settings} width={previewWidth} />
      </View>

      {/* Draggable settings sheet */}
      <Animated.View style={[styles.sheet, { height: SHEET_H }, sheetStyle]}>
        <View onLayout={(e) => { headerH.value = e.nativeEvent.layout.height; }}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chips}>
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, activeSection === s.key && styles.chipActive]}
                onPress={() => setActiveSection(s.key)}
              >
                <Text style={[styles.chipText, activeSection === s.key && styles.chipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Animated.View style={controlsWrapStyle}>
        <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {activeSection === "themes" && (
            <>
              <SectionTitle title="Built-in" />
              <View style={styles.presetGrid}>
                {BUILT_IN_PRESETS.map((p) => (
                  <TouchableOpacity key={p.name} style={styles.presetCard} onPress={() => applyPreset(p.settings)}>
                    <View style={styles.presetDots}>
                      <View style={[styles.dot, { backgroundColor: p.settings.background.mode === "solid" ? p.settings.background.solid.color : p.settings.background.gradient.startColor }]} />
                      <View style={[styles.dot, { backgroundColor: p.settings.arabic.color }]} />
                    </View>
                    <Text style={styles.presetName}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {userPresets.length > 0 && (
                <>
                  <SectionTitle title="My Presets" />
                  <View style={styles.presetGrid}>
                    {userPresets.map((p) => (
                      <TouchableOpacity
                        key={p.name}
                        style={styles.presetCard}
                        onPress={() => applyPreset(p.settings)}
                        onLongPress={() => handleDeletePreset(p.name)}
                      >
                        <View style={styles.presetDots}>
                          <View style={[styles.dot, { backgroundColor: p.settings.background.mode === "solid" ? p.settings.background.solid.color : p.settings.background.gradient.startColor }]} />
                          <View style={[styles.dot, { backgroundColor: p.settings.arabic.color }]} />
                        </View>
                        <Text style={styles.presetName}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {activeSection === "background" && (
            <>
              <SegmentedRow
                label="Mode"
                options={[
                  { id: "gradient", label: "Gradient" },
                  { id: "solid", label: "Solid" },
                ]}
                value={settings.background.mode}
                onChange={(v) => update("background.mode", v)}
              />
              {settings.background.mode === "gradient" ? (
                <>
                  <ColorRow label="Start Color" value={settings.background.gradient.startColor} onChange={(v) => update("background.gradient.startColor", v)} />
                  <ColorRow label="End Color" value={settings.background.gradient.endColor} onChange={(v) => update("background.gradient.endColor", v)} />
                  <SliderRow label="Angle" value={settings.background.gradient.angle} min={0} max={360} step={5} format={(v) => `${v}°`} onChange={(v) => update("background.gradient.angle", v)} />
                  <SliderRow label="Dark Overlay" value={settings.background.gradient.overlayOpacity} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("background.gradient.overlayOpacity", v)} />
                </>
              ) : (
                <ColorRow label="Color" value={settings.background.solid.color} onChange={(v) => update("background.solid.color", v)} />
              )}
            </>
          )}

          {activeSection === "arabic" && (
            <>
              <SwitchRow label="Show" value={settings.arabic.visible} onChange={(v) => update("arabic.visible", v)} />
              <SegmentedRow label="Font" options={ARABIC_FONTS} value={settings.arabic.fontFamily} onChange={(v) => update("arabic.fontFamily", v)} />
              <SegmentedRow label="Weight" options={FONT_WEIGHTS} value={settings.arabic.fontWeight} onChange={(v) => update("arabic.fontWeight", v)} />
              <SliderRow label="Size" value={settings.arabic.fontSize} min={60} max={220} onChange={(v) => update("arabic.fontSize", v)} />
              <ColorRow label="Color" value={settings.arabic.color} onChange={(v) => update("arabic.color", v)} />
              <SliderRow label="Opacity" value={settings.arabic.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("arabic.opacity", v)} />
              <SliderRow label="Letter Spacing" value={settings.arabic.letterSpacing} min={0} max={24} onChange={(v) => update("arabic.letterSpacing", v)} />
              <SliderRow label="Line Height" value={settings.arabic.lineHeight} min={1} max={2} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => update("arabic.lineHeight", v)} />
            </>
          )}

          {["transliteration", "translation"].includes(activeSection) && (
            <>
              <SwitchRow label="Show" value={settings[activeSection].visible} onChange={(v) => update(`${activeSection}.visible`, v)} />
              <SegmentedRow label="Font" options={LATIN_FONTS} value={settings[activeSection].fontFamily} onChange={(v) => update(`${activeSection}.fontFamily`, v)} />
              <SegmentedRow label="Weight" options={FONT_WEIGHTS} value={settings[activeSection].fontWeight} onChange={(v) => update(`${activeSection}.fontWeight`, v)} />
              <SliderRow label="Size" value={settings[activeSection].fontSize} min={20} max={100} onChange={(v) => update(`${activeSection}.fontSize`, v)} />
              <ColorRow label="Color" value={settings[activeSection].color} onChange={(v) => update(`${activeSection}.color`, v)} />
              <SliderRow label="Opacity" value={settings[activeSection].opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update(`${activeSection}.opacity`, v)} />
            </>
          )}

          {activeSection === "meaning" && (
            <>
              <SwitchRow label="Show" value={settings.meaning.visible} onChange={(v) => update("meaning.visible", v)} />
              <SegmentedRow label="Font" options={LATIN_FONTS} value={settings.meaning.fontFamily} onChange={(v) => update("meaning.fontFamily", v)} />
              <SegmentedRow label="Weight" options={FONT_WEIGHTS} value={settings.meaning.fontWeight} onChange={(v) => update("meaning.fontWeight", v)} />
              <SliderRow label="Size" value={settings.meaning.fontSize} min={16} max={64} onChange={(v) => update("meaning.fontSize", v)} />
              <ColorRow label="Color" value={settings.meaning.color} onChange={(v) => update("meaning.color", v)} />
              <SliderRow label="Opacity" value={settings.meaning.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("meaning.opacity", v)} />
              <SliderRow label="Max Width" value={settings.meaning.maxWidthPct} min={0.4} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("meaning.maxWidthPct", v)} />
              <SliderRow label="Line Spacing" value={settings.meaning.lineSpacing} min={24} max={90} onChange={(v) => update("meaning.lineSpacing", v)} />
            </>
          )}

          {activeSection === "numberBadge" && (
            <>
              <SwitchRow label="Show" value={settings.numberBadge.visible} onChange={(v) => update("numberBadge.visible", v)} />
              <SliderRow label="Size" value={settings.numberBadge.fontSize} min={16} max={64} onChange={(v) => update("numberBadge.fontSize", v)} />
              <ColorRow label="Color" value={settings.numberBadge.color} onChange={(v) => update("numberBadge.color", v)} />
              <SliderRow label="Opacity" value={settings.numberBadge.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("numberBadge.opacity", v)} />
              <SliderRow label="Bottom Spacing" value={settings.numberBadge.bottomSpacing} min={20} max={320} onChange={(v) => update("numberBadge.bottomSpacing", v)} />
            </>
          )}

          {activeSection === "layout" && (
            <>
              <SliderRow label="Top Offset" value={settings.layout.topOffsetPct} min={0.05} max={0.7} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("layout.topOffsetPct", v)} />
              <SliderRow label="Space after Arabic" value={settings.layout.spacingAfterArabic} min={0} max={220} onChange={(v) => update("layout.spacingAfterArabic", v)} />
              <SliderRow label="Space after Transliteration" value={settings.layout.spacingAfterTranslit} min={0} max={220} onChange={(v) => update("layout.spacingAfterTranslit", v)} />
              <SliderRow label="Space after Translation" value={settings.layout.spacingAfterTranslation} min={0} max={220} onChange={(v) => update("layout.spacingAfterTranslation", v)} />
              <SliderRow label="Content Width" value={settings.layout.contentWidthPct} min={0.5} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("layout.contentWidthPct", v)} />
              <SegmentedRow label="Horizontal Align" options={ALIGNMENTS} value={settings.layout.align} onChange={(v) => update("layout.align", v)} />
              <SliderRow label="Safe Margin" value={settings.layout.safeMargin} min={0} max={140} onChange={(v) => update("layout.safeMargin", v)} />
            </>
          )}

          {activeSection === "effects" && (
            <>
              <SectionTitle title="Shadow" />
              <SwitchRow label="Enable" value={settings.effects.shadow.enabled} onChange={(v) => update("effects.shadow.enabled", v)} />
              <SliderRow label="Blur" value={settings.effects.shadow.blur} min={0} max={40} onChange={(v) => update("effects.shadow.blur", v)} />
              <SliderRow label="Offset X" value={settings.effects.shadow.offsetX} min={-20} max={20} onChange={(v) => update("effects.shadow.offsetX", v)} />
              <SliderRow label="Offset Y" value={settings.effects.shadow.offsetY} min={-20} max={20} onChange={(v) => update("effects.shadow.offsetY", v)} />
              <SliderRow label="Opacity" value={settings.effects.shadow.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("effects.shadow.opacity", v)} />
              <ColorRow label="Color" value={settings.effects.shadow.color} onChange={(v) => update("effects.shadow.color", v)} />
              <SectionTitle title="Glow" />
              <SwitchRow label="Enable" value={settings.effects.glow.enabled} onChange={(v) => update("effects.glow.enabled", v)} />
              <SliderRow label="Strength" value={settings.effects.glow.strength} min={2} max={40} onChange={(v) => update("effects.glow.strength", v)} />
              <ColorRow label="Color" value={settings.effects.glow.color} onChange={(v) => update("effects.glow.color", v)} />
              <SectionTitle title="Outline" />
              <SwitchRow label="Enable" value={settings.effects.outline.enabled} onChange={(v) => update("effects.outline.enabled", v)} />
              <SliderRow label="Thickness" value={settings.effects.outline.thickness} min={0.5} max={8} step={0.5} onChange={(v) => update("effects.outline.thickness", v)} />
              <ColorRow label="Color" value={settings.effects.outline.color} onChange={(v) => update("effects.outline.color", v)} />
            </>
          )}
        </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.barButton} onPress={handleReset}>
          <Text style={styles.barButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.barButton} onPress={() => setPresetModal(true)}>
          <Text style={styles.barButtonText}>Save Preset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.barButton, styles.barButtonPrimary]} onPress={handleSetWallpaper} disabled={busy}>
          {busy ? <ActivityIndicator color={theme.onAccent} /> : <Text style={[styles.barButtonText, styles.barButtonPrimaryText]}>Set Wallpaper</Text>}
        </TouchableOpacity>
      </View>

      {/* Save-preset name prompt (Alert.prompt is iOS-only, hence a modal) */}
      <Modal visible={presetModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Preset</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Preset name"
              placeholderTextColor={theme.textSecondary}
              value={presetName}
              onChangeText={setPresetName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPresetModal(false)} style={styles.barButton}>
                <Text style={styles.barButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePreset} style={[styles.barButton, styles.barButtonPrimary]}>
                <Text style={[styles.barButtonText, styles.barButtonPrimaryText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 48,
      paddingHorizontal: 8,
      height: 92,
    },
    topButton: {
      width: 44,
      alignItems: "center",
    },
    topTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
    },
    previewArea: {
      height: SCREEN_H * 0.42,
      alignItems: "center",
      justifyContent: "center",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: BOTTOM_BAR_H,
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handleArea: {
      alignItems: "center",
      paddingVertical: 10,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.inputBorder,
    },
    chipsRow: {
      flexGrow: 0,
    },
    chips: {
      paddingHorizontal: 12,
      gap: 8,
      paddingBottom: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: theme.cardAlt,
    },
    chipActive: {
      backgroundColor: theme.accent,
    },
    chipText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    chipTextActive: {
      color: theme.onAccent,
    },
    controls: {
      flex: 1,
    },
    controlsContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    presetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    presetCard: {
      backgroundColor: theme.cardAlt,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      minWidth: 100,
    },
    presetDots: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 8,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.inputBorder,
    },
    presetName: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "600",
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: BOTTOM_BAR_H,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    barButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: theme.cardAlt,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    barButtonText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    barButtonPrimary: {
      backgroundColor: theme.accent,
    },
    barButtonPrimaryText: {
      color: theme.onAccent,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      padding: 32,
    },
    modalCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 12,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 8,
      color: theme.text,
      padding: 12,
      fontSize: 15,
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
    },
  });
