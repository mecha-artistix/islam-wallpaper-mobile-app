import { File, Paths } from "expo-file-system";

export async function saveWallpaper(tempUri) {
  const source = new File(tempUri);

  const destination = new File(
    Paths.cache,
    "wallpaper.png"
  );

  if (destination.exists) {
    destination.delete();
  }

  source.copy(destination);

  console.log("Saved path:", destination.uri);
  console.log("Exists after copy:", destination.exists);

  return destination.uri;
}