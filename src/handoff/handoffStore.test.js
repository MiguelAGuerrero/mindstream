import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useHandoffStore } from "./handoffStore.js";
import { useShelfStore } from "../shelf/shelfStore.js";

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
  replyTo: { tool: "thinkpad", ref },
  to: { tool: "focus" },
  want: "step-through",
  text: "Do the thing",
  context: ["context"],
});

const thinkRequest = () => ({
  replyTo: { tool: "focus", ref: "12" },
  to: { tool: "thinkpad" },
  want: "think",
  text: "Ship the timer UI change",
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

  it("creates a request and consumes it exactly once", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(h.id).toMatch(/^ho:/);
    expect(s.consume(h.id, "focus").text).toBe("Do the thing");
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
    expect(s.create({ ...input(), text: "" })).toBe(null);
    expect(s.create()).toBe(null);
    for (const id of [undefined, null, "", "garbage", 42, {}, ["ho:1"]]) {
      expect(s.peek(id, "focus")).toBe(null);
      expect(s.consume(id, "focus")).toBe(null);
    }
  });

  it("does not deliver to a tool that is not the receiver", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.peek(h.id, "thinkpad")).toBe(null);
    expect(s.consume(h.id, "thinkpad")).toBe(null);
    expect(s.peek(h.id, "focus")).not.toBe(null);
  });

  it("replies once and ignores invalid ones", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.reply(h.id, { outcome: "nope" })).toBe(false);
    expect(s.reply("missing", { outcome: "resolved" })).toBe(false);
    expect(s.reply(h.id, { outcome: "resolved", minutes: 25, text: "done" })).toBe(true);
    expect(s.reply(h.id, { outcome: "abandoned" })).toBe(false);
    expect(s.summaryFor("thinkpad", "thread:1")).toMatchObject({ sessions: 1, minutes: 25, lastText: "done" });
  });

  it("summaryFor shows 2 sessions, 50 min for two requests from one ref", () => {
    const s = freshStore();
    const a = s.create(input());
    const b = s.create(input());
    s.create(input("thread:other"));
    s.reply(a.id, { outcome: "resolved", minutes: 20 });
    s.reply(b.id, { outcome: "abandoned", minutes: 30 });
    expect(s.summaryFor("thinkpad", "thread:1")).toMatchObject({ sessions: 2, minutes: 50 });
    expect(s.summaryFor("thinkpad", "thread:other")).toBe(null);
  });

  it("routeFor carries only the request id", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.routeFor(h)).toEqual({ name: "focus", query: { handoff: h.id } });
    expect(s.routeFor(null)).toBe(null);
  });

  it("stays consumed after a reload (fresh pinia + hydrate)", () => {
    const s = freshStore();
    const h = s.create(input());
    s.consume(h.id, "focus");
    s.reply(h.id, { outcome: "resolved", minutes: 5 });
    const s2 = freshStore();
    s2.hydrate();
    expect(s2.peek(h.id, "focus")).toBe(null);
    expect(s2.consume(h.id, "focus")).toBe(null);
    expect(s2.summaryFor("thinkpad", "thread:1").minutes).toBe(5);
  });

  it("a pending request survives reload until consumed", () => {
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

describe("handoffStore: the sender reads its own reply", () => {
  beforeEach(() => stubLocalStorage());
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("replyFor returns the reply only to the sender, and only once written", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    expect(s.replyFor(h.id, "focus")).toBe(null);
    s.consume(h.id, "thinkpad");
    s.reply(h.id, { outcome: "resolved", steps: ["a", "b"] });
    expect(s.replyFor(h.id, "focus").steps.map((x) => x.prompt)).toEqual(["a", "b"]);
    expect(s.replyFor(h.id, "thinkpad")).toBe(null);
    expect(s.replyFor("nope", "focus")).toBe(null);
  });

  it("get is readable by sender and receiver only", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    expect(s.get(h.id, "focus").id).toBe(h.id);
    expect(s.get(h.id, "thinkpad").id).toBe(h.id);
    expect(s.get(h.id, "workflows")).toBe(null);
  });

  it("bindTarget attaches a ref once; openFor finds the request until a reply lands", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    expect(s.openFor("thinkpad", "pad:1")).toBe(null);
    s.consume(h.id, "thinkpad");
    expect(s.bindTarget(h.id, "thinkpad", "pad:1")).toBe(true);
    expect(s.bindTarget(h.id, "thinkpad", "pad:2")).toBe(false);
    expect(s.bindTarget(h.id, "focus", "x")).toBe(false);
    expect(s.openFor("thinkpad", "pad:1").id).toBe(h.id);
    s.reply(h.id, { outcome: "resolved", text: "done" });
    expect(s.openFor("thinkpad", "pad:1")).toBe(null);
  });

  it("cancel stops a request nobody has accepted and ends it as abandoned", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    expect(s.cancel(h.id, "thinkpad")).toBe(false);
    expect(s.cancel(h.id, "focus")).toBe(true);
    expect(s.peek(h.id, "thinkpad")).toBe(null);
    expect(s.replyFor(h.id, "focus")).toMatchObject({ outcome: "abandoned" });
  });

  it("cancel keeps a reply the receiver already sent", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    s.consume(h.id, "thinkpad");
    s.reply(h.id, { outcome: "resolved", steps: ["a"] });
    s.cancel(h.id, "focus");
    expect(s.replyFor(h.id, "focus").outcome).toBe("resolved");
  });

  it("decline turns a request down: it cannot be accepted and ends as abandoned", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.decline(h.id, "thinkpad")).toBe(false); // only the tool it was sent to
    expect(s.waiting.map((w) => w.id)).toEqual([h.id]);
    expect(s.decline(h.id, "focus")).toBe(true);
    expect(s.peek(h.id, "focus")).toBe(null);
    expect(s.replyFor(h.id, "thinkpad")).toMatchObject({ outcome: "abandoned" });
    expect(s.waiting).toEqual([]);
  });

  it("decline leaves a request that was already accepted alone", () => {
    const s = freshStore();
    const h = s.create(input());
    s.consume(h.id, "focus");
    expect(s.decline(h.id, "focus")).toBe(false);
    expect(s.waiting.map((w) => w.id)).toEqual([h.id]);
  });

  it("declining a one-way send puts its text on the shelf", () => {
    const s = freshStore();
    const h = s.create({ oneWay: true, to: { tool: "focus" }, want: "step-through", text: "Call the bank" });
    expect(s.decline(h.id, "focus")).toBe(true);
    expect(useShelfStore().items.map((i) => i.text)).toEqual(["Call the bank"]);
  });

  it("acceptedBy lists what a tool took and has not answered", () => {
    const s = freshStore();
    const a = s.create(input("thread:1"));
    const b = s.create(input("thread:2"));
    s.create(input("thread:3")); // never accepted
    s.consume(a.id, "focus");
    s.consume(b.id, "focus");
    s.reply(b.id, { outcome: "resolved", text: "done" });
    expect(s.acceptedBy("focus").map((h) => h.id)).toEqual([a.id]);
    expect(s.acceptedBy("thinkpad")).toEqual([]);
  });

  it("declining a one-way set of steps does not put it on the shelf", () => {
    const s = freshStore();
    const h = s.create({ oneWay: true, to: { tool: "focus" }, want: "step-through", text: "Weekly review", steps: ["Look back", "Look ahead"] });
    expect(s.decline(h.id, "focus")).toBe(true);
    expect(useShelfStore().items).toEqual([]);
    expect(s.waiting).toEqual([]);
  });

  it("waitingFrom lists what a tool sent that is unanswered; summaryFor can be narrowed to one verb", () => {
    const s = freshStore();
    const a = s.create(input("thread:1"));
    const b = s.create({ ...input("thread:1"), to: { tool: "workflows" }, want: "choose-steps" });
    expect(s.waitingFrom("thinkpad").map((h) => h.id)).toEqual([a.id, b.id]);
    s.cancel(b.id, "thinkpad");
    expect(s.waitingFrom("thinkpad").map((h) => h.id)).toEqual([a.id]);
    expect(s.summaryFor("thinkpad", "thread:1", "step-through")).toBe(null);
    expect(s.summaryFor("thinkpad", "thread:1")).toMatchObject({ sessions: 1 });
  });
});
