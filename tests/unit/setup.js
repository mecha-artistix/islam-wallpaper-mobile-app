// Test setup. Provides a controllable fake SecureStore and expo-file-system so
// preferences.js / logger.js logic can be tested without a device.
//
// jest.mock() factories cannot reference out-of-scope variables (Babel guard),
// so the fake stores live on `global` and the factories read `global`.

// ── Fake SecureStore ──────────────────────────────────────────────────────────
global.__secureStore = new Map();
global.__files = new Map();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key) =>
    global.__secureStore.has(key) ? global.__secureStore.get(key) : null
  ),
  setItemAsync: jest.fn(async (key, value) => {
    global.__secureStore.set(key, String(value));
  }),
  deleteItemAsync: jest.fn(async (key) => {
    global.__secureStore.delete(key);
  }),
}));

// ── Fake expo-file-system (File/Paths) ────────────────────────────────────────
// logger.js and preferences.js (presets file) use expo-file-system's File API.
// The class is defined INSIDE the factory to satisfy Babel's out-of-scope guard.
jest.mock("expo-file-system", () => {
  class FakeFile {
    constructor(path, name) {
      this._path = name ? `${path}/${name}` : path;
    }
    get exists() {
      return global.__files.has(this._path);
    }
    async text() {
      return global.__files.get(this._path) ?? "";
    }
    write(data) {
      global.__files.set(this._path, String(data));
    }
    delete() {
      global.__files.delete(this._path);
    }
    get uri() {
      return `file://${this._path}`;
    }
  }
  return {
    File: FakeFile,
    Paths: { document: "/documents", cache: "/cache" },
  };
});

// ── Reset all fakes between tests ─────────────────────────────────────────────
beforeEach(() => {
  global.__secureStore.clear();
  global.__files.clear();
  jest.clearAllMocks();
});
