import { describe, expect, it } from "vitest";
import { createRequest, normalizeHandoffRecord, normalizeReply, summarizeReplies } from "./handoffModel.js";

const valid = () => ({
  replyTo: { tool: "thinkpad", ref: "thread:1" },
  to: { tool: "focus" },
  want: "step-through",
  text: "  Write it  ",
  context: [" why ", "", "outer"],
});
const make = (input = valid()) => createRequest(input, { id: "ho:1", now: "2024-01-01T00:00:00.000Z" });

describe("createRequest", () => {
  it("builds a request in the §4.2 shape with no reply yet", () => {
    expect(make()).toEqual({
      id: "ho:1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "request",
      text: "Write it",
      context: ["why", "outer"],
      want: "step-through",
      replyTo: { tool: "thinkpad", ref: "thread:1" },
      tag: null,
      to: { tool: "focus" },
      consumedAt: null,
      reply: null,
    });
  });

  it("carries steps and an opaque tag", () => {
    const h = make({ ...valid(), steps: ["a", { prompt: "b", expects: "call", options: ["x"] }, ""], tag: " wf:1@v2 " });
    expect(h.steps).toEqual([
      { prompt: "a", produces: "text" },
      { prompt: "b", produces: "text", expects: "call", options: ["x"] },
    ]);
    expect(h.tag).toBe("wf:1@v2");
    expect(make().steps).toBeUndefined();
  });

  it("accepts a numeric ref as a string", () => {
    expect(make({ ...valid(), replyTo: { tool: "focus", ref: 12 } }).replyTo).toEqual({ tool: "focus", ref: "12" });
  });

  it("rejects no reply address, no text, or a receiver that doesn't serve the verb", () => {
    expect(make({ ...valid(), replyTo: { tool: "thinkpad", ref: " " } })).toBe(null);
    expect(make({ ...valid(), replyTo: undefined })).toBe(null);
    expect(make({ ...valid(), text: "  " })).toBe(null);
    expect(make({ ...valid(), to: { tool: "thinkpad" } })).toBe(null);
    expect(make({ ...valid(), want: "nope" })).toBe(null);
    expect(make({ ...valid(), to: { tool: "thinkpad" }, want: "think", steps: [{ prompt: "a", produces: "action" }] })).toBe(null);
    expect(createRequest(valid(), {})).toBe(null);
  });
});

describe("normalizeReply", () => {
  it("keeps outcome, text, steps, plain notes and minutes, and hands the tag back", () => {
    const request = make({ ...valid(), tag: "t1" });
    expect(
      normalizeReply({ outcome: "resolved", text: " done ", steps: ["a"], notes: [" unchecked\n x ", ""], minutes: 25 }, request),
    ).toEqual({
      kind: "reply",
      inReplyTo: "ho:1",
      outcome: "resolved",
      text: "done",
      steps: [{ prompt: "a", produces: "text" }],
      notes: ["unchecked x"],
      tag: "t1",
      minutes: 25,
    });
  });

  it("lets a reply name its own tag, and allows a sharper question", () => {
    expect(normalizeReply({ outcome: "question", text: "Which?", tag: "wf:9@v1" }, make()).tag).toBe("wf:9@v1");
    expect(normalizeReply({ outcome: "question" }, make()).outcome).toBe("question");
  });

  it("rejects an unknown outcome and drops bad minutes", () => {
    expect(normalizeReply({ outcome: "completed" }, make())).toBe(null);
    expect(normalizeReply(null, make())).toBe(null);
    expect(normalizeReply({ outcome: "abandoned", minutes: -1 }, make()).minutes).toBeUndefined();
  });
});

describe("normalizeHandoffRecord", () => {
  it("revives a stored request, dropping an invalid reply", () => {
    const h = { ...make(), consumedAt: "2024-01-02T00:00:00.000Z", to: { tool: "focus", ref: "ctx:3" }, reply: { outcome: "bad" } };
    const out = normalizeHandoffRecord(JSON.parse(JSON.stringify(h)));
    expect(out.consumedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(out.to.ref).toBe("ctx:3");
    expect(out.reply).toBe(null);
  });

  it("reads records written in the earlier { from, to.intent, task, result } shape", () => {
    const legacy = {
      id: "ho:old",
      createdAt: "2024-01-01T00:00:00.000Z",
      from: { tool: "thinkpad", ref: "thread:1" },
      to: { tool: "focus", intent: "start-session" },
      task: { title: "Write it", notes: "why", steps: [{ title: "Pick", decision: { options: ["a"] } }] },
      result: { status: "completed", minutes: 20, reflection: "shipped" },
      consumedAt: "2024-01-01T01:00:00.000Z",
    };
    expect(normalizeHandoffRecord(legacy)).toMatchObject({
      text: "Write it",
      context: ["why"],
      want: "step-through",
      replyTo: { tool: "thinkpad", ref: "thread:1" },
      steps: [{ prompt: "Pick", expects: "call", options: ["a"] }],
      reply: { outcome: "resolved", text: "shipped", minutes: 20 },
    });
  });

  it("returns null for malformed records", () => {
    expect(normalizeHandoffRecord(null)).toBe(null);
    expect(normalizeHandoffRecord("x")).toBe(null);
    expect(normalizeHandoffRecord({})).toBe(null);
    expect(normalizeHandoffRecord({ ...make(), id: "" })).toBe(null);
    expect(normalizeHandoffRecord({ ...make(), text: "" })).toBe(null);
  });
});

describe("summarizeReplies", () => {
  it("aggregates two sessions to 2 sessions and 50 min", () => {
    const a = { ...make(), reply: { outcome: "resolved", minutes: 20, text: "first" } };
    const b = { ...make(), createdAt: "2024-01-02T00:00:00.000Z", reply: { outcome: "abandoned", minutes: 30, text: "second" } };
    expect(summarizeReplies([b, a])).toEqual({ sessions: 2, minutes: 50, resolved: 1, lastText: "second" });
  });

  it("is null when nothing has a reply", () => {
    expect(summarizeReplies([make()])).toBe(null);
    expect(summarizeReplies([])).toBe(null);
    expect(summarizeReplies(undefined)).toBe(null);
  });
});

describe("one-way Send (roadmap §4.3: a request with no reply address)", () => {
  const send = (extra = {}) => createRequest(
    { oneWay: true, replyTo: null, to: { tool: "thinkpad" }, want: "think", text: "Rear-foot-elevated split squats?", ...extra },
    { id: "s1", now: "2026-11-24T00:00:00.000Z" },
  );

  it("is accepted only when marked one-way, and carries no reply address", () => {
    expect(send()).toMatchObject({ oneWay: true, replyTo: null, text: "Rear-foot-elevated split squats?" });
    expect(createRequest({ replyTo: null, to: { tool: "thinkpad" }, want: "think", text: "x" }, { id: "s2" })).toBe(null);
  });

  it("survives save and load", () => {
    expect(normalizeHandoffRecord(JSON.parse(JSON.stringify(send())))).toMatchObject({ oneWay: true, replyTo: null });
  });
});
