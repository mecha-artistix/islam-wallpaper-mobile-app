import { File, Paths } from "expo-file-system";

// Persistent ring-buffer log. console.* is invisible for headless background
// runs unless adb is attached, so wallpaper changes are also written to a file
// and viewable in-app under Settings → Debug Logs.
const logFile = new File(Paths.document, "app_logs.json");
const MAX_ENTRIES = 200;

// Serialize writes — the OS background task and the UI can log at the same time.
let queue = Promise.resolve();

function enqueue(fn) {
  queue = queue.then(fn).catch(() => {});
  return queue;
}

export function logEvent(tag, message) {
  console.log(`[${tag}] ${message}`);
  return enqueue(async () => {
    let entries = [];
    try {
      if (logFile.exists) entries = JSON.parse(await logFile.text());
    } catch {
      entries = [];
    }
    entries.push({ t: new Date().toISOString(), tag, message });
    if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
    logFile.write(JSON.stringify(entries));
  });
}

// Newest first.
export async function getLogs() {
  try {
    if (!logFile.exists) return [];
    return JSON.parse(await logFile.text()).reverse();
  } catch {
    return [];
  }
}

export async function clearLogs() {
  return enqueue(() => {
    if (logFile.exists) logFile.delete();
  });
}
