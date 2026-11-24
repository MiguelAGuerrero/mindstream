import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIEW_MODE,
  FOCUS_UI_SCHEMA_VERSION,
  clearViewMode,
  isViewMode,
  readViewMode,
  writeViewMode,
} from "./focusUiStorage.js";

const KEY = "mindstream.focusUi.v1";

// Vitest runs in a node environment (no DOM), so stub the storage surface the
// helper touches. The helper itself guards `typeof localStorage`.
function stubLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

describe("focusUiStorage", () => {
  beforeEach(() => stubLocalStorage());
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("round-trips a view mode", () => {
    writeViewMode("rail");
    expect(readViewMode()).toBe("rail");
  });

  it("defaults to the stack board when nothing is stored", () => {
    expect(readViewMode()).toBe("stack");
    expect(DEFAULT_VIEW_MODE).toBe("stack");
  });

  it("falls back to the default on malformed JSON instead of throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("falls back to the default on a schema-version mismatch", () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 999, viewMode: "rail" }));
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("falls back to the default on an unknown mode", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: FOCUS_UI_SCHEMA_VERSION, viewMode: "kanban" }),
    );
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("refuses to write an unknown mode", () => {
    writeViewMode("rail");
    writeViewMode("kanban");
    expect(readViewMode()).toBe("rail"); // the good value survives
  });

  it("isViewMode does not resolve prototype members", () => {
    expect(isViewMode("stack")).toBe(true);
    expect(isViewMode("constructor")).toBe(false);
    expect(isViewMode("toString")).toBe(false);
    expect(isViewMode(null)).toBe(false);
  });

  it("clearViewMode removes the blob", () => {
    writeViewMode("rail");
    clearViewMode();
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("is a no-op without a localStorage (SSR/node safety)", () => {
    delete globalThis.localStorage;
    expect(() => writeViewMode("rail")).not.toThrow();
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
    expect(() => clearViewMode()).not.toThrow();
  });
});
