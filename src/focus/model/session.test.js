import { describe, expect, it } from "vitest";
import { createFocusFrame, createContext, formatElapsed, normalizeContextRecord } from "./session.js";

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
  it("wraps a root frame in a fresh, un-parked stack", () => {
    const root = createFocusFrame({ id: 1, title: "Ship it" });
    const ctx = createContext({ id: 10, rootFrame: root, createdAt: "2026-06-15T00:00:00.000Z" });
    expect(ctx).toEqual({
      id: 10,
      stack: [root],
      parked: false,
      waitingOn: "",
      resolved: false,
      createdAt: "2026-06-15T00:00:00.000Z",
      notes: "",
      origin: null,
      handoffId: null,
      spentSeconds: 0,
      awaitingHandoffId: null,
    });
  });

  it("tolerates a missing root frame", () => {
    expect(createContext({ id: 1 }).stack).toEqual([]);
  });
});

describe("normalizeContextRecord", () => {
  const stored = {
    id: 3,
    stack: [
      { id: 1, title: "Ship it", result: null, createdAt: "2026-06-15T00:00:00.000Z" },
      { id: 2, title: "Write the tests", result: "half done", createdAt: "2026-06-15T01:00:00.000Z" },
    ],
    parked: true,
    waitingOn: "CI queue",
    resolved: false,
    createdAt: "2026-06-15T00:00:00.000Z",
  };

  it("round-trips a live context through JSON", () => {
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(stored)));
    expect(revived).toEqual({ ...stored, notes: "", origin: null, handoffId: null, spentSeconds: 0, awaitingHandoffId: null });
  });

  it("rejects records without a usable id or root frame", () => {
    expect(normalizeContextRecord(null)).toBe(null);
    expect(normalizeContextRecord("junk")).toBe(null);
    expect(normalizeContextRecord({ stack: [{ id: 1, title: "x" }] })).toBe(null);
    expect(normalizeContextRecord({ id: 4, stack: [] })).toBe(null);
    expect(normalizeContextRecord({ id: 4, stack: "not-an-array" })).toBe(null);
  });

  it("drops malformed frames but keeps the context while a root survives", () => {
    const revived = normalizeContextRecord({
      id: 5,
      stack: [
        { id: 1, title: "Root" },
        { title: "no id" },
        { id: 2, title: "   " },
        null,
        { id: 3, title: "Valid child" },
      ],
    });
    expect(revived.stack.map((f) => f.id)).toEqual([1, 3]);
  });

  it("defaults missing flags and junk field types", () => {
    const revived = normalizeContextRecord({
      id: 6,
      stack: [{ id: 1, title: "Root", result: 42, createdAt: 99 }],
      parked: "yes",
      waitingOn: 7,
      resolved: "maybe",
    });
    expect(revived).toMatchObject({
      parked: false,
      waitingOn: "",
      resolved: false,
      createdAt: null,
    });
    expect(revived.stack[0]).toMatchObject({ result: null, createdAt: null });
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
describe("handoff fields on a context", () => {
  const frame = createFocusFrame({ id: 1, title: "Root" });
  it("default to empty on a new or old record", () => {
    const fresh = createContext({ id: 1, rootFrame: frame });
    expect(fresh).toMatchObject({ notes: "", origin: null, handoffId: null, spentSeconds: 0 });
    const old = normalizeContextRecord({ id: 2, stack: [{ id: 3, title: "Old" }] });
    expect(old).toMatchObject({ notes: "", origin: null, handoffId: null, spentSeconds: 0 });
  });
  it("round-trip through normalizeContextRecord", () => {
    const ctx = createContext({
      id: 1,
      rootFrame: frame,
      notes: "why",
      origin: { tool: "thinkpad", ref: "thread:1" },
      handoffId: "ho:1",
    });
    ctx.spentSeconds = 90;
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(ctx)));
    expect(revived).toMatchObject({ notes: "why", origin: { tool: "thinkpad", ref: "thread:1" }, handoffId: "ho:1", spentSeconds: 90 });
  });
  it("coerce junk to defaults instead of dropping the record", () => {
    const revived = normalizeContextRecord({
      id: 1,
      stack: [{ id: 2, title: "T" }],
      notes: 5,
      origin: { tool: "x" },
      handoffId: 7,
      spentSeconds: -3,
    });
    expect(revived).toMatchObject({ notes: "", origin: null, handoffId: null, spentSeconds: 0 });
  });
});

describe("awaitingHandoffId on a context", () => {
  const frame = createFocusFrame({ id: 1, title: "Root" });
  it("defaults to null and round-trips a string id", () => {
    const ctx = createContext({ id: 1, rootFrame: frame });
    expect(ctx.awaitingHandoffId).toBe(null);
    ctx.awaitingHandoffId = "ho:abc:1";
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(ctx)));
    expect(revived.awaitingHandoffId).toBe("ho:abc:1");
  });
  it("coerces junk and old records to null", () => {
    const base = { id: 2, stack: [{ id: 3, title: "T" }] };
    expect(normalizeContextRecord(base).awaitingHandoffId).toBe(null);
    expect(normalizeContextRecord({ ...base, awaitingHandoffId: 9 }).awaitingHandoffId).toBe(null);
    expect(normalizeContextRecord({ ...base, awaitingHandoffId: "" }).awaitingHandoffId).toBe(null);
  });
});

describe("plan fields on a frame", () => {
  it("are absent on a plain frame and kept when set", () => {
    expect(createFocusFrame({ id: 1, title: "T" })).toEqual({ id: 1, title: "T", result: null, createdAt: null });
    expect(createFocusFrame({ id: 1, title: "T", steps: [" a ", "", "b"], stepIndex: 1 })).toMatchObject({
      steps: [{ title: "a" }, { title: "b" }],
      stepIndex: 1,
    });
    expect(createFocusFrame({ id: 2, title: "S", fromStep: 0 }).fromStep).toBe(0);
  });

  it("clamp the index and drop junk", () => {
    expect(createFocusFrame({ id: 1, title: "T", steps: ["a"], stepIndex: 9 }).stepIndex).toBe(1);
    expect(createFocusFrame({ id: 1, title: "T", steps: ["a"], stepIndex: -4 }).stepIndex).toBe(0);
    expect(createFocusFrame({ id: 1, title: "T", steps: "nope" }).steps).toBeUndefined();
    expect(createFocusFrame({ id: 1, title: "T", fromStep: -1 }).fromStep).toBeUndefined();
  });

  it("round-trip through a persisted context", () => {
    const ctx = createContext({
      id: 1,
      rootFrame: createFocusFrame({ id: 2, title: "Root", steps: [{ title: "a" }, { title: "b" }], stepIndex: 1 }),
    });
    ctx.stack.push(createFocusFrame({ id: 3, title: "b", fromStep: 1 }));
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(ctx)));
    expect(revived.stack[0]).toMatchObject({ steps: [{ title: "a" }, { title: "b" }], stepIndex: 1 });
    expect(revived.stack[1].fromStep).toBe(1);
  });
});
