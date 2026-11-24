import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useHandoffStore } from "./handoffStore.js";

function stubLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

const input = (ref = "thread:1") => ({
  from: { tool: "thinkpad", ref },
  to: { tool: "focus", intent: "start-session" },
  task: { title: "Do the thing", notes: "context" },
});

function freshStore() {
  setActivePinia(createPinia());
  return useHandoffStore();
}

describe("handoffStore", () => {
  beforeEach(() => stubLocalStorage());
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("creates a handoff and consumes it exactly once", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(h.id).toMatch(/^ho:/);
    expect(s.consume(h.id, "focus").task.title).toBe("Do the thing");
    expect(s.consume(h.id, "focus")).toBe(null);
    expect(s.peek(h.id, "focus")).toBe(null);
  });

  it("peek does not consume", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.peek(h.id, "focus")).not.toBe(null);
    expect(s.peek(h.id, "focus")).not.toBe(null);
    expect(s.consume(h.id, "focus")).not.toBe(null);
  });

  it("returns null for invalid input, and for missing, undefined or garbage ids", () => {
    const s = freshStore();
    expect(s.create({ ...input(), task: { title: "" } })).toBe(null);
    expect(s.create()).toBe(null);
    for (const id of [undefined, null, "", "garbage", 42, {}, ["ho:1"]]) {
      expect(s.peek(id, "focus")).toBe(null);
      expect(s.consume(id, "focus")).toBe(null);
    }
  });

  it("does not deliver to a tool that is not the target", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.peek(h.id, "thinkpad")).toBe(null);
    expect(s.consume(h.id, "thinkpad")).toBe(null);
    expect(s.peek(h.id, "focus")).not.toBe(null);
  });

  it("writes a result once and ignores invalid ones", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.writeResult(h.id, { status: "nope", minutes: 1 })).toBe(false);
    expect(s.writeResult("missing", { status: "completed", minutes: 1 })).toBe(false);
    expect(s.writeResult(h.id, { status: "completed", minutes: 25, reflection: "done" })).toBe(true);
    expect(s.writeResult(h.id, { status: "abandoned", minutes: 1 })).toBe(false);
    expect(s.summaryFor("thinkpad", "thread:1")).toMatchObject({ sessions: 1, minutes: 25, lastReflection: "done" });
  });

  it("summaryFor shows 2 sessions, 50 min for two handoffs on one ref", () => {
    const s = freshStore();
    const a = s.create(input());
    const b = s.create(input());
    s.create(input("thread:other"));
    s.writeResult(a.id, { status: "completed", minutes: 20 });
    s.writeResult(b.id, { status: "abandoned", minutes: 30 });
    expect(s.summaryFor("thinkpad", "thread:1")).toMatchObject({ sessions: 2, minutes: 50 });
    expect(s.summaryFor("thinkpad", "thread:other")).toBe(null);
  });

  it("routeFor carries only the handoff id", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.routeFor(h)).toEqual({ name: "focus", query: { handoff: h.id } });
    expect(s.routeFor(null)).toBe(null);
  });

  it("stays consumed after a reload (fresh pinia + hydrate)", () => {
    const s = freshStore();
    const h = s.create(input());
    s.consume(h.id, "focus");
    s.writeResult(h.id, { status: "completed", minutes: 5 });
    const s2 = freshStore();
    s2.hydrate();
    expect(s2.peek(h.id, "focus")).toBe(null);
    expect(s2.consume(h.id, "focus")).toBe(null);
    expect(s2.summaryFor("thinkpad", "thread:1").minutes).toBe(5);
  });

  it("a pending handoff survives reload until consumed", () => {
    const s = freshStore();
    const h = s.create(input());
    const s2 = freshStore();
    expect(s2.peek(h.id, "focus")).not.toBe(null);
  });

  it("skips malformed stored records", () => {
    const s = freshStore();
    const h = s.create(input());
    const raw = JSON.parse(localStorage.getItem("mindstream.handoffs.v1"));
    raw.handoffs.push({ id: "bad" }, null, "x");
    localStorage.setItem("mindstream.handoffs.v1", JSON.stringify(raw));
    const s2 = freshStore();
    s2.hydrate();
    expect(s2.handoffs.map((x) => x.id)).toEqual([h.id]);
  });
});

describe("handoffStore: sender reads its own result", () => {
  beforeEach(() => stubLocalStorage());
  afterEach(() => {
    delete globalThis.localStorage;
  });

  const decompose = () => ({
    from: { tool: "focus", ref: "12" },
    to: { tool: "thinkpad", intent: "decompose" },
    task: { title: "Ship the timer UI change" },
  });

  it("resultFor returns the output only to the sending tool, and only once written", () => {
    const s = freshStore();
    const h = s.create(decompose());
    expect(s.resultFor(h.id, "focus")).toBe(null);
    s.consume(h.id, "thinkpad");
    s.writeResult(h.id, { status: "completed", minutes: 4, output: { items: ["a", "b"] } });
    expect(s.resultFor(h.id, "focus").output).toEqual({ items: [{ title: "a" }, { title: "b" }] });
    expect(s.resultFor(h.id, "thinkpad")).toBe(null);
    expect(s.resultFor("nope", "focus")).toBe(null);
  });

  it("bindTarget attaches a ref once; openFor finds the handoff until a result lands", () => {
    const s = freshStore();
    const h = s.create(decompose());
    expect(s.openFor("thinkpad", "pad:1")).toBe(null);
    s.consume(h.id, "thinkpad");
    expect(s.bindTarget(h.id, "thinkpad", "pad:1")).toBe(true);
    expect(s.bindTarget(h.id, "thinkpad", "pad:2")).toBe(false);
    expect(s.bindTarget(h.id, "focus", "x")).toBe(false);
    expect(s.openFor("thinkpad", "pad:1").id).toBe(h.id);
    s.writeResult(h.id, { status: "completed", minutes: 1, output: { text: "done" } });
    expect(s.openFor("thinkpad", "pad:1")).toBe(null);
  });

  it("cancel stops a handoff nobody has accepted and records it as abandoned", () => {
    const s = freshStore();
    const h = s.create(decompose());
    expect(s.cancel(h.id, "thinkpad")).toBe(false);
    expect(s.cancel(h.id, "focus")).toBe(true);
    expect(s.peek(h.id, "thinkpad")).toBe(null);
    expect(s.resultFor(h.id, "focus")).toEqual({ status: "abandoned", minutes: 0 });
  });

  it("cancel keeps a result the target already wrote", () => {
    const s = freshStore();
    const h = s.create(decompose());
    s.consume(h.id, "thinkpad");
    s.writeResult(h.id, { status: "completed", minutes: 2, output: { items: ["a"] } });
    s.cancel(h.id, "focus");
    expect(s.resultFor(h.id, "focus").status).toBe("completed");
  });
});
