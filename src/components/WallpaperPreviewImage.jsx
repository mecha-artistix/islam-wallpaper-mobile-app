import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { generateWallpaperImage } from "../services/wallpaper/generator";
import { useTheme, radii } from "../theme";

// Renders the generated wallpaper PNG for a given name. Uses the existing
// generator (the single source of truth) so the preview always matches what
// gets set on the device. Caches the URI per `name.number` so re-renders on
// the same name (e.g. on focus) don't re-generate.
//
// `settings` is optional — when omitted, the saved wallpaper settings are used
// (so this always reflects the user's current theme). This mirrors the
// generator's own behavior.
const cache = new Map(); // name.number -> uri

export function WallpaperPreviewImage({ name, settings, aspectRatio = 9 / 16, style }) {
  const theme = useTheme();
  const [uri, setUri] = useState(() => (name ? cache.get(name.number) : null));
  const [loading, setLoading] = useState(!uri);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!name) return;
    const cached = cache.get(name.number);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUri(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    generateWallpaperImage(name, settings)
      .then((u) => {
        if (cancelled) return;
        cache.set(name.number, u);
        setUri(u);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name?.number, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.wrap, style]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.textTertiary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Image
            // Render whatever was last generated for this number if available,
            // else nothing. Avoids a hard error screen on a transient Skia issue.
            source={uri ? { uri } : null}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      ) : (
        uri && <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      )}
    </View>
  );
}

// Allow callers to invalidate the cache (e.g. after customization changes that
// should force a re-render of the preview even for the same name).
export function clearWallpaperPreviewCache(nameNumber) {
  if (nameNumber == null) cache.clear();
  else cache.delete(nameNumber);
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
