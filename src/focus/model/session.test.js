import { describe, expect, it } from "vitest";
import { createFocusFrame, createContext, formatElapsed } from "./session.js";

describe("createFocusFrame", () => {
  it("carries an authored focus with an empty result", () => {
    const frame = createFocusFrame({
      id: 7,
      title: "Untangle the deploy flakiness",
      createdAt: "2026-06-15T00:00:00.000Z",
    });
    expect(frame).toEqual({
      id: 7,
      title: "Untangle the deploy flakiness",
      result: null,
      createdAt: "2026-06-15T00:00:00.000Z",
    });
  });

  it("defaults missing fields", () => {
    expect(createFocusFrame({ id: 1 })).toEqual({ id: 1, title: "", result: null, createdAt: null });
    expect(createFocusFrame({ id: 2, title: 123 }).title).toBe("");
  });
});

describe("createContext", () => {
  it("wraps a root frame in a fresh, un-parked, unresolved stack", () => {
    const root = createFocusFrame({ id: 1, title: "Ship it" });
    const ctx = createContext({ id: 10, rootFrame: root, createdAt: "2026-06-15T00:00:00.000Z" });
    expect(ctx).toEqual({
      id: 10,
      stack: [root],
      parked: false,
      waitingOn: "",
      resolved: false,
      createdAt: "2026-06-15T00:00:00.000Z",
    });
  });

  it("tolerates a missing root frame", () => {
    expect(createContext({ id: 1 }).stack).toEqual([]);
  });
});

describe("formatElapsed", () => {
  it("formats seconds as m:ss", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(5)).toBe("0:05");
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(600)).toBe("10:00");
  });

  it("clamps junk input to 0:00", () => {
    expect(formatElapsed(-10)).toBe("0:00");
    expect(formatElapsed(NaN)).toBe("0:00");
    expect(formatElapsed(undefined)).toBe("0:00");
  });
});
