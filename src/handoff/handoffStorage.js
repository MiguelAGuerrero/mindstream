// Handoff persistence — a synchronous localStorage blob, like the dashboard
// layout and focus UI preferences: handoffs are tiny messages that must be
// readable synchronously on route entry. On any schema mismatch or parse
// failure we fall back to empty rather than migrate.
const STORAGE_KEY = "mindstream.handoffs.v1";
export const HANDOFF_SCHEMA_VERSION = 1;

function storageAvailable() {
  return typeof localStorage !== "undefined";
}

/** Read the persisted handoff records; null when absent, malformed, or version-mismatched. */
export function readHandoffs() {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== HANDOFF_SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.handoffs)) return null;
    return parsed.handoffs;
  } catch {
    return null;
  }
}

/** Persist the handoffs array (fire-and-forget; quota errors are swallowed). */
export function writeHandoffs(handoffs) {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: HANDOFF_SCHEMA_VERSION, handoffs }));
  } catch {
    // Quota exceeded / privacy mode — worst case a handoff is not remembered.
  }
}

export function clearHandoffs() {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
