// Tests the rotation routine's concurrency guard (rotationInFlight) and the
// index-advancement contract. These are the automated checks for the
// requirements in docs/features/rotation.md:
//   - Multiple concurrent invocations cannot corrupt the selected index.
//   - Only one rotation changes the wallpaper at a time.
//   - The in-flight flag is cleared after success AND after failure.
//   - A second concurrent invocation is skipped (returns null), not blocked
//     forever — future rotations still proceed.
//
// The Skia generator, native wallpaper module, and notifications are mocked
// so we test rotation LOGIC, not rendering/native behavior. Background OS-level
// invocation is NOT tested here (see tests/MANUAL-CHECKLIST.md).

// ── Mocks for the heavy/native deps ───────────────────────────────────────────
// The generator returns a distinct URI per call so we can count actual
// generations (and thus confirm only one rotation ran).
// NOTE: jest.mock() factories cannot reference out-of-scope variables unless
// they are prefixed with `mock` (case-insensitive) per Babel's guard.
let mockGenerateCallCount = 0;
jest.mock("../../src/services/wallpaper/generator", () => ({
  generateWallpaperImage: jest.fn(async () => {
    mockGenerateCallCount += 1;
    return `file://cache/wallpaper_${mockGenerateCallCount}.png`;
  }),
}));
jest.mock("../../src/services/wallpaper/manager", () => ({
  setDeviceWallpaper: jest.fn(async () => true),
}));
jest.mock("../../src/services/notifications", () => ({
  notifyWallpaperChanged: jest.fn(async () => {}),
  ensureNotificationPermission: jest.fn(async () => true),
  sendAppNotification: jest.fn(async () => true),
}));

// Silence the module-load console.log from rotation.js / backgroundTask.js.
jest.spyOn(console, "log").mockImplementation(() => {});

const {
  rotateWallpaper,
  applyWallpaper,
} = require("../../src/services/wallpaper/rotation");
const {
  getSelectedNameIndex,
  setSelectedNameIndex,
  setLastRotation,
  setRotationIntervalMinutes,
  setAutoRotate,
} = require("../../src/services/preferences");
const { generateWallpaperImage } = require("../../src/services/wallpaper/generator");
const { setDeviceWallpaper } = require("../../src/services/wallpaper/manager");

jest.useFakeTimers();
const MINUTE = 60 * 1000;

beforeEach(async () => {
  mockGenerateCallCount = 0;
  generateWallpaperImage.mockClear();
  setDeviceWallpaper.mockClear();
  await setAutoRotate(true);
  await setSelectedNameIndex(0);
  await setLastRotation(Date.now());
  await setRotationIntervalMinutes(1);
});

describe("rotateWallpaper — concurrency (rotationInFlight)", () => {
  test("two truly concurrent invocations → exactly one rotation runs", async () => {
    // Start both WITHOUT awaiting (they share the in-flight flag).
    const p1 = rotateWallpaper({ force: true, source: "test" });
    const p2 = rotateWallpaper({ force: true, source: "test" });
    const [r1, r2] = await Promise.all([p1, p2]);

    // Exactly one returns a name, the other returns null (skipped).
    const names = [r1, r2].filter(Boolean);
    expect(names.length).toBe(1);
    // Exactly one generation + one apply happened.
    expect(generateWallpaperImage).toHaveBeenCalledTimes(1);
    expect(setDeviceWallpaper).toHaveBeenCalledTimes(1);
  });

  test("in-flight flag is cleared after success → next call proceeds", async () => {
    await rotateWallpaper({ force: true, source: "test" });
    await rotateWallpaper({ force: true, source: "test" });
    // Two sequential calls both ran (no permanent block).
    expect(generateWallpaperImage).toHaveBeenCalledTimes(2);
    expect(setDeviceWallpaper).toHaveBeenCalledTimes(2);
  });

  test("in-flight flag is cleared after failure → next call proceeds", async () => {
    // Make the first call throw inside the generation step.
    generateWallpaperImage.mockRejectedValueOnce(new Error("boom"));
    await expect(rotateWallpaper({ force: true, source: "test" })).rejects.toThrow("boom");
    // The flag must be cleared — second call should proceed normally.
    await rotateWallpaper({ force: true, source: "test" });
    expect(generateWallpaperImage).toHaveBeenCalledTimes(2);
    expect(setDeviceWallpaper).toHaveBeenCalledTimes(1); // first failed before apply
  });

  test("concurrent invocations cannot corrupt the selected index", async () => {
    // Start three concurrent forced rotations.
    await Promise.all([
      rotateWallpaper({ force: true, source: "test" }),
      rotateWallpaper({ force: true, source: "test" }),
      rotateWallpaper({ force: true, source: "test" }),
    ]);
    // Only one should have advanced the index from 0 → 1.
    expect(await getSelectedNameIndex()).toBe(1);
  });
});

describe("rotateWallpaper — index advancement", () => {
  test("advances the selected index by 1 (0 → 1)", async () => {
    await setSelectedNameIndex(0);
    const name = await rotateWallpaper({ force: true, source: "test" });
    expect(await getSelectedNameIndex()).toBe(1);
    expect(name).toBeTruthy();
  });

  test("wraps from last index back to 0 (circular)", async () => {
    // Set to the last index (98 for a 99-name list).
    const { ASMA_UL_HUSNA } = require("../../src/data/asmaUlHusna");
    const last = ASMA_UL_HUSNA.length - 1;
    await setSelectedNameIndex(last);
    await rotateWallpaper({ force: true, source: "test" });
    expect(await getSelectedNameIndex()).toBe(0);
  });
});

describe("applyWallpaper — manual path still works (must not be broken)", () => {
  test("applies a given URI and updates index + clock", async () => {
    const { ASMA_UL_HUSNA } = require("../../src/data/asmaUlHusna");
    const name = ASMA_UL_HUSNA[5];
    await applyWallpaper({ uri: "file://x.png", name, index: 5, source: "manual" });
    expect(setDeviceWallpaper).toHaveBeenCalledWith("file://x.png");
    expect(await getSelectedNameIndex()).toBe(5);
  });
});
