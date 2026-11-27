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
    expect(s.accept(h.id, "focus", "work:1").text).toBe("Do the thing");
    expect(s.accept(h.id, "focus", "work:1")).toBe(null);
    expect(s.peek(h.id, "focus")).toBe(null);
  });

  it("peek does not consume", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.peek(h.id, "focus")).not.toBe(null);
    expect(s.peek(h.id, "focus")).not.toBe(null);
    expect(s.accept(h.id, "focus", "work:1")).not.toBe(null);
  });

  it("returns null for invalid input, and for missing, undefined or garbage ids", () => {
    const s = freshStore();
    expect(s.create({ ...input(), text: "" })).toBe(null);
    expect(s.create()).toBe(null);
    for (const id of [undefined, null, "", "garbage", 42, {}, ["ho:1"]]) {
      expect(s.peek(id, "focus")).toBe(null);
      expect(s.accept(id, "focus", "work:1")).toBe(null);
    }
  });

  it("does not deliver to a tool that is not the receiver", () => {
    const s = freshStore();
    const h = s.create(input());
    expect(s.peek(h.id, "thinkpad")).toBe(null);
    expect(s.accept(h.id, "thinkpad", "work:1")).toBe(null);
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
    s.accept(h.id, "focus", "work:1");
    s.reply(h.id, { outcome: "resolved", minutes: 5 });
    const s2 = freshStore();
    s2.hydrate();
    expect(s2.peek(h.id, "focus")).toBe(null);
    expect(s2.accept(h.id, "focus", "work:1")).toBe(null);
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
    s.accept(h.id, "thinkpad", "work:1");
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

  it("accept binds the request to the work made for it; openFor finds it until a reply lands", () => {
    const s = freshStore();
    const h = s.create(thinkRequest());
    expect(s.openFor("thinkpad", "pad:1")).toBe(null);
    expect(s.accept(h.id, "focus", "pad:1")).toBe(null); // not the tool it was sent to
    expect(s.accept(h.id, "thinkpad", "pad:1").to.ref).toBe("pad:1");
    expect(s.accept(h.id, "thinkpad", "pad:2")).toBe(null); // once only
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
    s.accept(h.id, "thinkpad", "work:1");
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
    s.accept(h.id, "focus", "work:1");
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
    s.accept(a.id, "focus", "work:1");
    s.accept(b.id, "focus", "work:1");
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

  // The rule (roadmap Revisions 40-41): every request ends with an answer.
  // A receiver cannot take one without saying what becomes of it.
  describe("a request cannot be taken and left", () => {
    it("has no way to take a request without an outcome", () => {
      const s = freshStore();
      expect(s.consume).toBeUndefined();
      expect(s.bindTarget).toBeUndefined();
    });

    it("accept refuses a request that expects a reply unless the work is named", () => {
      const s = freshStore();
      const h = s.create(input());
      expect(s.accept(h.id, "focus")).toBe(null);
      expect(s.accept(h.id, "focus", "  ")).toBe(null);
      expect(s.peek(h.id, "focus")).toBeTruthy(); // still pending, nothing was taken
      expect(s.accept(h.id, "focus", "ctx:1")).toBeTruthy();
    });

    it("a one-way send can be accepted without naming work, and never counts as waiting", () => {
      const s = freshStore();
      const h = s.create({ oneWay: true, to: { tool: "focus" }, want: "step-through", text: "Call the bank" });
      expect(s.accept(h.id, "focus")).toBeTruthy();
      expect(s.waiting).toEqual([]);
    });

    it("answer takes and replies in one step", () => {
      const s = freshStore();
      const h = s.create(thinkRequest());
      expect(s.answer(h.id, "thinkpad", { outcome: "nonsense" })).toBe(null);
      expect(s.peek(h.id, "thinkpad")).toBeTruthy();
      expect(s.answer(h.id, "thinkpad", { outcome: "resolved", steps: ["a"] }).id).toBe(h.id);
      expect(s.replyFor(h.id, "focus").outcome).toBe("resolved");
      expect(s.waiting).toEqual([]);
    });

    it("every way a request can end leaves nothing waiting", () => {
      const endings = {
        "declined by the receiver": (s, h) => s.decline(h.id, "focus"),
        "answered at once": (s, h) => s.answer(h.id, "focus", { outcome: "resolved", text: "done" }),
        "accepted, then replied": (s, h) => { s.accept(h.id, "focus", "ctx:1"); s.reply(h.id, { outcome: "resolved" }); },
        "accepted, then the work is deleted": (s, h) => { s.accept(h.id, "focus", "ctx:1"); s.settleAccepted("focus", () => false); },
        "cancelled by the asker before it was taken": (s, h) => s.cancel(h.id, "thinkpad"),
        "cancelled by the asker after it was accepted": (s, h) => { s.accept(h.id, "focus", "ctx:1"); s.cancel(h.id, "thinkpad"); },
        "the asker is deleted": (s) => s.cancelOrphans("thinkpad", () => false),
      };
      for (const [name, end] of Object.entries(endings)) {
        const s = freshStore();
        const h = s.create(input());
        expect(s.waiting.map((w) => w.id), name).toEqual([h.id]);
        end(s, h);
        expect(s.waiting, name).toEqual([]);
        expect(s.replyFor(h.id, "thinkpad"), name).toBeTruthy();
      }
    });

    it("settling and cancelling leave live work and live askers alone", () => {
      const s = freshStore();
      const a = s.create(input("thread:1"));
      const b = s.create(input("thread:2"));
      s.accept(a.id, "focus", "ctx:1");
      s.accept(b.id, "focus", "ctx:2");
      expect(s.settleAccepted("focus", (h) => h.to.ref === "ctx:1")).toBe(1);
      expect(s.cancelOrphans("thinkpad", (h) => h.replyTo.ref === "thread:1")).toBe(0);
      expect(s.waiting.map((w) => w.id)).toEqual([a.id]);
    });
  });
});
