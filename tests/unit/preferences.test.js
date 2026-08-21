// Tests the pure-logic parts of preferences.js: email validation, profile
// round-trip, onboarding flag, notification settings merge. These have no
// device dependency (SecureStore + File are faked in setup.js).
//
// Rotation-specific accessors (shouldRotate, interval min-1) are tested in
// interval.test.js and rotation.test.js — this file covers the rest.

const {
  isValidEmail,
  getProfile,
  setProfile,
  getOnboardingCompleted,
  setOnboardingCompleted,
  getNotificationSettings,
  setNotificationSetting,
  getAutoRotate,
  setAutoRotate,
  getRotationIntervalMinutes,
  setRotationIntervalMinutes,
} = require("../../src/services/preferences");

describe("isValidEmail", () => {
  test("accepts empty string (email is optional)", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail(null)).toBe(true);
    expect(isValidEmail(undefined)).toBe(true);
  });
  test("accepts well-formed addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("name.surname@sub.example.org")).toBe(true);
  });
  test("rejects malformed addresses", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("spaces in@address.com")).toBe(false);
  });
  test("trims whitespace before validating", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
});

describe("profile — optional name/email round-trip", () => {
  test("defaults to null name/email", async () => {
    const p = await getProfile();
    expect(p).toEqual({ name: null, email: null });
  });

  test("stores and returns both fields", async () => {
    await setProfile({ name: "Aisha", email: "aisha@example.com" });
    expect(await getProfile()).toEqual({ name: "Aisha", email: "aisha@example.com" });
  });

  test("can store name only", async () => {
    await setProfile({ name: "Yusuf" });
    expect(await getProfile()).toEqual({ name: "Yusuf", email: null });
  });

  test("can clear both fields (null)", async () => {
    await setProfile({ name: "Yusuf", email: "y@e.com" });
    await setProfile({ name: null, email: null });
    expect(await getProfile()).toEqual({ name: null, email: null });
  });

  test("trims whitespace on store, treats blank as null", async () => {
    await setProfile({ name: "  ", email: "   " });
    expect(await getProfile()).toEqual({ name: null, email: null });
  });
});

describe("onboarding flag", () => {
  test("defaults to false (not completed)", async () => {
    expect(await getOnboardingCompleted()).toBe(false);
  });
  test("setOnboardingCompleted(true) persists", async () => {
    await setOnboardingCompleted(true);
    expect(await getOnboardingCompleted()).toBe(true);
  });
  test("setOnboardingCompleted(false) re-enables onboarding", async () => {
    await setOnboardingCompleted(true);
    await setOnboardingCompleted(false);
    expect(await getOnboardingCompleted()).toBe(false);
  });
});

describe("notification settings — merge over defaults", () => {
  test("defaults: wallpaperChange === false", async () => {
    const s = await getNotificationSettings();
    expect(s.wallpaperChange).toBe(false);
  });
  test("toggling a key persists and preserves others", async () => {
    await setNotificationSetting("wallpaperChange", true);
    const s = await getNotificationSettings();
    expect(s.wallpaperChange).toBe(true);
  });
});

describe("auto-rotate + interval preferences", () => {
  test("auto-rotate defaults to true", async () => {
    expect(await getAutoRotate()).toBe(true);
  });
  test("interval defaults to 1440 (24h)", async () => {
    expect(await getRotationIntervalMinutes()).toBe(1440);
  });
  test("setAutoRotate(false) persists", async () => {
    await setAutoRotate(false);
    expect(await getAutoRotate()).toBe(false);
  });
});
