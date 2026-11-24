// Focus chrome preference — which context view you last used (the stack board
// vs. the rail). A synchronous localStorage blob like dashboardLayoutStorage,
// and deliberately NOT focusDb: this is chrome preference, not domain data, so
// it must not ride the context write-through or share its schema.
//
// Any parse / schema / unknown-value problem falls back to the default rather
// than migrating; worst case the view resets once.

const STORAGE_KEY = "mindstream.focusUi.v1";

export const FOCUS_UI_SCHEMA_VERSION = 1;

/** The two context views. Stack is the default — first run opens on the board. */
export const VIEW_MODES = Object.freeze(["stack", "rail"]);
export const DEFAULT_VIEW_MODE = "stack";

/** Membership test against the frozen ARRAY, not an object map: an object
 *  lookup would happily resolve "constructor" through the prototype. */
export function isViewMode(value) {
  return typeof value === "string" && VIEW_MODES.includes(value);
}

function storageAvailable() {
  return typeof localStorage !== "undefined";
}

/** Read the persisted view mode. Returns DEFAULT_VIEW_MODE — never null —
 *  when absent, malformed, version-mismatched, or not a known mode: the
 *  caller has no useful fallback logic of its own. */
export function readViewMode() {
  if (!storageAvailable()) return DEFAULT_VIEW_MODE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW_MODE;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== FOCUS_UI_SCHEMA_VERSION) return DEFAULT_VIEW_MODE;
    return isViewMode(parsed.viewMode) ? parsed.viewMode : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

/** Persist the view mode (fire-and-forget; unknown modes and quota errors are ignored). */
export function writeViewMode(mode) {
  if (!storageAvailable()) return;
  if (!isViewMode(mode)) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: FOCUS_UI_SCHEMA_VERSION, viewMode: mode }),
    );
  } catch {
    // Quota exceeded / privacy mode — the view is a preference; losing it is fine.
  }
}

export function clearViewMode() {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
