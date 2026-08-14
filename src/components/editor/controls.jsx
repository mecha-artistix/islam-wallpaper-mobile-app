import { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { COLOR_SWATCHES } from "../../services/wallpaper/settings";
import { useTheme } from "../../theme";

// Generic building blocks for the wallpaper editor. Each control edits ONE
// path in wallpaperSettings via the onChange callback — no rendering logic here.

export function SectionTitle({ title }) {
  const styles = makeStyles(useTheme());
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function SliderRow({ label, value, min, max, step = 1, onChange, format }) {
  const styles = makeStyles(useTheme());
  const [trackWidth, setTrackWidth] = useState(1);
  const trackPageX = useRef(0);
  // PanResponder must be created once — recreating it mid-drag resets the
  // gesture and makes the thumb jump. Latest props go through this ref instead.
  const latest = useRef({ min, max, step, onChange, trackWidth });
  useEffect(() => {
    latest.current = { min, max, step, onChange, trackWidth };
  });

  const [responder, setResponder] = useState(null);
  useEffect(() => {
    const handleTouch = (pageX) => {
      const { min: lo, max: hi, step: st, onChange: cb, trackWidth: tw } = latest.current;
      const ratio = Math.max(0, Math.min(1, (pageX - trackPageX.current) / tw));
      const raw = lo + ratio * (hi - lo);
      const snapped = Math.round(raw / st) * st;
      cb(Math.max(lo, Math.min(hi, parseFloat(snapped.toFixed(3)))));
    };
    setResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.pageX),
        onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.pageX),
      })
    );
  }, []);

  const ratio = (value - min) / (max - min);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{format ? format(value) : value}</Text>
      </View>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          e.target.measure((x, y, w, h, pageX) => {
            trackPageX.current = pageX;
          });
        }}
        {...(responder ? responder.panHandlers : {})}
      >
        <View style={styles.sliderRail} />
        <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

export function ColorRow({ label, value, onChange }) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.hexInput}
          value={value}
          autoCapitalize="characters"
          maxLength={7}
          onChangeText={(text) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(text)) onChange(text.toUpperCase());
            else onChange(text);
          }}
        />
      </View>
      <View style={styles.swatchRow}>
        {COLOR_SWATCHES.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.swatch, { backgroundColor: color }, value === color && styles.swatchSelected]}
            onPress={() => onChange(color)}
          />
        ))}
      </View>
    </View>
  );
}

export function SegmentedRow({ label, options, value, onChange }) {
  const styles = makeStyles(useTheme());
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segmented}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.segment, value === opt.id && styles.segmentActive]}
            onPress={() => onChange(opt.id)}
          >
            <Text style={[styles.segmentText, value === opt.id && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function SwitchRow({ label, value, onChange }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.row, styles.switchRow]}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.inputBorder, true: theme.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 4,
    },
    row: {
      paddingVertical: 10,
    },
    rowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    label: {
      fontSize: 15,
      color: theme.text,
    },
    value: {
      fontSize: 14,
      color: theme.accent,
      fontWeight: "600",
    },
    sliderTrack: {
      height: 28,
      justifyContent: "center",
    },
    sliderRail: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.cardAlt,
    },
    sliderFill: {
      position: "absolute",
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.accent,
    },
    sliderThumb: {
      position: "absolute",
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.text,
      marginLeft: -9,
    },
    hexInput: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 6,
      color: theme.text,
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 13,
      width: 90,
      textAlign: "center",
    },
    swatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    swatch: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.inputBorder,
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: theme.accent,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.cardAlt,
      borderRadius: 8,
      padding: 3,
      marginTop: 6,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: theme.accent,
    },
    segmentText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    segmentTextActive: {
      color: theme.onAccent,
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });
