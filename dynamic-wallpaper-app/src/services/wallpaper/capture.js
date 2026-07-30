export async function captureWallpaper(viewRef) {
  const uri = await viewRef.current.capture();

  console.log("Captured wallpaper:", uri);

  return uri;
}