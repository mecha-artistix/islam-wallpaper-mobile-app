import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ASMA_UL_HUSNA } from "../../data/asmaUlHusna";
import { useTheme, spacing, radii, type, layout } from "../../theme";

// Browse all 99 Names. Search filters by transliteration, translation, Arabic
// name, or number. The list is visually calm: generous spacing, a small number,
// the Arabic name set in the app's Arabic face, and the transliteration +
// meaning beneath. Tapping a row opens the detail screen.
export default function NamesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASMA_UL_HUSNA;
    return ASMA_UL_HUSNA.filter((n) => {
      return (
        n.transliteration.toLowerCase().includes(q) ||
        n.translation.toLowerCase().includes(q) ||
        n.name.includes(q) ||
        String(n.number) === q
      );
    });
  }, [query]);

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      onPress={() => router.push({ pathname: "/name/[id]", params: { id: String(item.number) } })}
    >
      <Text style={s.arabic} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.name}</Text>
      <View style={s.rowText}>
        <Text style={s.transliteration}>{item.transliteration}</Text>
        <Text style={s.translation} numberOfLines={1}>{item.translation}</Text>
      </View>
      <Text style={s.number}>{item.number}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Names of Allah</Text>
        <Text style={s.subtitle}>99 · Asma ul Husna</Text>
      </View>
      <View style={s.searchWrap}>
        <TextInputLite
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, meaning, or number"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginLeft: 100 }} />}
        contentContainerStyle={[s.list, { paddingBottom: layout.scrollBottomTab + insets.bottom }]}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No names match “{query}”.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// Lightweight search input — kept inline to match the calm aesthetic (no
// bordered box; a soft surface with a leading icon).
function TextInputLite({ value, onChangeText, placeholder }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.inputWrap}>
      <Ionicons name="search" size={16} color={theme.textTertiary} style={s.inputIcon} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { paddingHorizontal: layout.screenPaddingH, paddingTop: layout.sectionGap, paddingBottom: spacing.sm },
    title: { color: theme.text, fontSize: type.display, fontWeight: "600", letterSpacing: -0.3 },
    subtitle: { color: theme.textSecondary, fontSize: type.caption, marginTop: 2 },
    searchWrap: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing.md },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
    },
    inputIcon: { marginRight: spacing.sm },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: type.body,
      paddingVertical: 12,
    },
    list: { paddingHorizontal: layout.screenPaddingH, paddingBottom: layout.scrollBottomTab },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 14,
    },
    rowPressed: { opacity: 0.55 },
    arabic: {
      color: theme.text,
      fontFamily: "NotoNaskhArabic",
      fontSize: type.arabicMedium,
      width: 84,
      textAlign: "center",
    },
    rowText: { flex: 1 },
    transliteration: { color: theme.text, fontSize: type.body, fontWeight: "600" },
    translation: { color: theme.textSecondary, fontSize: type.caption, marginTop: 2 },
    number: {
      color: theme.textTertiary,
      fontSize: type.caption,
      fontVariant: ["tabular-nums"],
      width: 24,
      textAlign: "right",
    },
    empty: { paddingVertical: spacing.xxxl, alignItems: "center" },
    emptyText: { color: theme.textSecondary, fontSize: type.body },
  });
