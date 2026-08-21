// Tests that notifications are scheduled with a channelId (the fix for the
// "no notification when wallpaper changes in background" bug). On Android 8+,
// a notification scheduled with `trigger: null` (no channel) is silently
// dropped. The fix attaches { channelId } to the trigger.
//
// See docs/features/notifications.md for the full picture.

// Mock expo-notifications so we can assert on the schedule call.
// NOTE: jest.mock() factories cannot reference out-of-scope variables unless
// prefixed with `mock` (Babel guard).
const mockScheduleSpy = jest.fn(async () => "id");
const mockSetChannelSpy = jest.fn(async () => ({}));
const mockGetPermsSpy = jest.fn(async () => ({ granted: true }));
const mockRequestPermsSpy = jest.fn(async () => ({ granted: true }));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(() => {}),
  getPermissionsAsync: (...args) => mockGetPermsSpy(...args),
  requestPermissionsAsync: (...args) => mockRequestPermsSpy(...args),
  setNotificationChannelAsync: (...args) => mockSetChannelSpy(...args),
  scheduleNotificationAsync: (...args) => mockScheduleSpy(...args),
  AndroidImportance: { DEFAULT: "default" },
}));

// Mock the preferences dependency (notifications reads notification_settings).
jest.mock("../../src/services/preferences", () => ({
  getNotificationSettings: jest.fn(async () => ({ wallpaperChange: true })),
}));

const { sendAppNotification, notifyWallpaperChanged } = require("../../src/services/notifications");

beforeEach(() => {
  mockScheduleSpy.mockClear();
  mockSetChannelSpy.mockClear();
  mockGetPermsSpy.mockClear();
  mockGetPermsSpy.mockResolvedValue({ granted: true });
});

describe("sendAppNotification — channel attachment (fix for silent drops)", () => {
  test("schedules with trigger.channelId (NOT null)", async () => {
    await sendAppNotification("Title", "Body");
    expect(mockScheduleSpy).toHaveBeenCalledTimes(1);
    const arg = mockScheduleSpy.mock.calls[0][0];
    // The trigger MUST be an object with channelId — not null.
    expect(arg.trigger).not.toBeNull();
    expect(arg.trigger).toEqual(expect.objectContaining({ channelId: "wallpaper" }));
  });

  test("creates the channel before scheduling", async () => {
    await sendAppNotification("Title", "Body");
    expect(mockSetChannelSpy).toHaveBeenCalledWith(
      "wallpaper",
      expect.objectContaining({ name: "Wallpaper updates" })
    );
  });

  test("returns false (no throw) if permission is denied", async () => {
    mockGetPermsSpy.mockResolvedValue({ granted: false });
    mockRequestPermsSpy.mockResolvedValue({ granted: false });
    const result = await sendAppNotification("Title", "Body");
    expect(result).toBe(false);
    expect(mockScheduleSpy).not.toHaveBeenCalled();
  });
});

describe("notifyWallpaperChanged — gated by settings", () => {
  test("sends a notification when wallpaperChange is enabled", async () => {
    await notifyWallpaperChanged({
      transliteration: "Ar-Rahman",
      translation: "The Most Gracious",
    });
    expect(mockScheduleSpy).toHaveBeenCalledTimes(1);
    const arg = mockScheduleSpy.mock.calls[0][0];
    expect(arg.content.title).toBe("Wallpaper updated");
    expect(arg.content.body).toContain("Ar-Rahman");
    expect(arg.trigger).toEqual(expect.objectContaining({ channelId: "wallpaper" }));
  });

  test("is a no-op when wallpaperChange is disabled", async () => {
    const { getNotificationSettings } = require("../../src/services/preferences");
    getNotificationSettings.mockResolvedValueOnce({ wallpaperChange: false });
    await notifyWallpaperChanged({ transliteration: "X", translation: "Y" });
    expect(mockScheduleSpy).not.toHaveBeenCalled();
  });
});
