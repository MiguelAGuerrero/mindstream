import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HANDOFF_SCHEMA_VERSION, clearHandoffs, readHandoffs, writeHandoffs } from "./handoffStorage.js";

function stubLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

describe("handoffStorage", () => {
  beforeEach(() => stubLocalStorage());
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("round-trips handoffs", () => {
    writeHandoffs([{ id: "ho:1" }]);
    expect(readHandoffs()).toEqual([{ id: "ho:1" }]);
  });

  it("returns null when nothing is stored", () => {
    expect(readHandoffs()).toBe(null);
  });

  it("returns null on malformed JSON", () => {
    localStorage.setItem("mindstream.handoffs.v1", "{nope");
    expect(readHandoffs()).toBe(null);
  });

  it("returns null on version mismatch or wrong shape", () => {
    localStorage.setItem("mindstream.handoffs.v1", JSON.stringify({ schemaVersion: HANDOFF_SCHEMA_VERSION + 1, handoffs: [] }));
    expect(readHandoffs()).toBe(null);
    localStorage.setItem("mindstream.handoffs.v1", JSON.stringify({ schemaVersion: HANDOFF_SCHEMA_VERSION, handoffs: {} }));
    expect(readHandoffs()).toBe(null);
  });

  it("clears", () => {
    writeHandoffs([]);
    clearHandoffs();
    expect(readHandoffs()).toBe(null);
  });

  it("is a no-op without localStorage", () => {
    delete globalThis.localStorage;
    expect(readHandoffs()).toBe(null);
    expect(() => writeHandoffs([])).not.toThrow();
    expect(() => clearHandoffs()).not.toThrow();
  });
});
