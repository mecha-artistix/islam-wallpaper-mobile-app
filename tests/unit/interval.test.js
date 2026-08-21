// Tests the rotation-interval handling: user-configured value is preserved
// verbatim (min 1 minute), NOT silently bumped to 15 minutes. This is the
// automated check for the requirement restored in this change set — see
// docs/decisions/003-user-interval-vs-os-scheduler-minimum.md.
//
// The OS scheduler's own minimum cadence (Android WorkManager ~15 min) is a
// platform behavior and is NOT tested here; it's covered by the manual
// checklist. Here we assert the app's contract:
//   1. The user value is stored verbatim.
//   2. setRotationIntervalMinutes(getRotationIntervalMinutes()) round-trips.
//   3. shouldRotate() honors the USER's value (elapsed-time gate), even when
//      that value is below 15 minutes.
jest.useFakeTimers();

const {
  getRotationIntervalMinutes,
  setRotationIntervalMinutes,
  setAutoRotate,
  setLastRotation,
  shouldRotate,
} = require("../../src/services/preferences");

const MINUTE = 60 * 1000;

describe("rotation interval — user value is preserved verbatim", () => {
  test("stores and returns a 1-minute interval", async () => {
    await setRotationIntervalMinutes(1);
    expect(await getRotationIntervalMinutes()).toBe(1);
  });

  test("stores and returns a sub-15 value (e.g. 5)", async () => {
    await setRotationIntervalMinutes(5);
    expect(await getRotationIntervalMinutes()).toBe(5);
  });

  test("stores arbitrary custom values (e.g. 90, 720, 10080)", async () => {
    for (const v of [90, 720, 10080, 43200]) {
      await setRotationIntervalMinutes(v);
      expect(await getRotationIntervalMinutes()).toBe(v);
    }
  });

  test("does NOT silently bump a 1-minute value to 15", async () => {
    await setRotationIntervalMinutes(1);
    const stored = await getRotationIntervalMinutes();
    expect(stored).toBe(1);
    expect(stored).not.toBe(15);
    expect(stored).not.toBeGreaterThan(15);
  });

  test("round-trips through get/set without mutation", async () => {
    await setRotationIntervalMinutes(3);
    const v = await getRotationIntervalMinutes();
    await setRotationIntervalMinutes(v);
    expect(await getRotationIntervalMinutes()).toBe(v);
  });
});

describe("shouldRotate — honors the USER's interval (elapsed-time gate)", () => {
  beforeAll(async () => {
    await setAutoRotate(true);
  });

  test("returns true when no last rotation is recorded", async () => {
    await setRotationIntervalMinutes(1);
    // shouldRotate reads getLastRotation() === null → true
    // (No lastRotation set in this test → expect true.)
    expect(await shouldRotate()).toBe(true);
  });

  test("returns false before the user interval has elapsed (1-min setting)", async () => {
    await setRotationIntervalMinutes(1);
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    await setLastRotation(Date.now());
    // 30 seconds later — less than 1 minute
    jest.setSystemTime(new Date("2025-01-01T00:00:30Z"));
    expect(await shouldRotate()).toBe(false);
  });

  test("returns true after the user interval has elapsed (1-min setting)", async () => {
    await setRotationIntervalMinutes(1);
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    await setLastRotation(Date.now());
    // 61 seconds later — past the 1-minute user interval
    jest.setSystemTime(new Date("2025-01-01T00:01:01Z"));
    expect(await shouldRotate()).toBe(true);
  });

  test("returns false when auto-rotate is off, regardless of time", async () => {
    await setAutoRotate(false);
    await setRotationIntervalMinutes(1);
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    await setLastRotation(Date.now());
    // Far in the future — should still be false because auto-rotate is off.
    jest.setSystemTime(new Date("2025-12-31T00:00:00Z"));
    expect(await shouldRotate()).toBe(false);
    await setAutoRotate(true); // restore for subsequent tests
  });
});
