import { describe, expect, it } from "vitest";
import { createHandoff, normalizeHandoffRecord, normalizeOutput, normalizeResult, summarizeResults } from "./handoffModel.js";

const valid = () => ({
  from: { tool: "thinkpad", ref: "thread:1" },
  to: { tool: "focus", intent: "start-session" },
  task: { title: "  Write it  ", notes: " why " },
});
const make = (input = valid()) => createHandoff(input, { id: "ho:1", now: "2024-01-01T00:00:00.000Z" });

describe("createHandoff", () => {
  it("builds a handoff with trimmed task and empty result", () => {
    expect(make()).toEqual({
      id: "ho:1",
      createdAt: "2024-01-01T00:00:00.000Z",
      from: { tool: "thinkpad", ref: "thread:1" },
      to: { tool: "focus", intent: "start-session" },
      task: { title: "Write it", notes: "why" },
      result: null,
      consumedAt: null,
    });
  });

  it("keeps suggestedMinutes only when positive and finite", () => {
    expect(make({ ...valid(), task: { title: "a", suggestedMinutes: 25 } }).task.suggestedMinutes).toBe(25);
    expect(make({ ...valid(), task: { title: "a", suggestedMinutes: 0 } }).task).toEqual({ title: "a" });
    expect(make({ ...valid(), task: { title: "a", suggestedMinutes: "5" } }).task).toEqual({ title: "a" });
  });

  it("rejects blank source, unaccepted target or intent, and blank title", () => {
    expect(make({ ...valid(), from: { tool: "thinkpad", ref: " " } })).toBe(null);
    expect(make({ ...valid(), from: undefined })).toBe(null);
    expect(make({ ...valid(), to: { tool: "thinkpad", intent: "start-session" } })).toBe(null);
    expect(make({ ...valid(), to: { tool: "focus", intent: "nope" } })).toBe(null);
    expect(make({ ...valid(), task: { title: "  " } })).toBe(null);
    expect(make({ ...valid(), task: null })).toBe(null);
    expect(createHandoff(valid(), {})).toBe(null);
  });
});

describe("normalizeResult", () => {
  it("accepts completed/abandoned with minutes and a one-line reflection", () => {
    expect(normalizeResult({ status: "completed", minutes: 25, reflection: " a\n b " })).toEqual({
      status: "completed",
      minutes: 25,
      reflection: "a b",
    });
    expect(normalizeResult({ status: "abandoned", minutes: 0 })).toEqual({ status: "abandoned", minutes: 0 });
  });

  it("rejects bad status or minutes", () => {
    expect(normalizeResult({ status: "paused", minutes: 1 })).toBe(null);
    expect(normalizeResult({ status: "completed", minutes: -1 })).toBe(null);
    expect(normalizeResult({ status: "completed", minutes: NaN })).toBe(null);
    expect(normalizeResult({ status: "completed" })).toBe(null);
    expect(normalizeResult(null)).toBe(null);
  });
});

describe("normalizeHandoffRecord", () => {
  it("revives a stored record, dropping an invalid result", () => {
    const h = { ...make(), consumedAt: "2024-01-02T00:00:00.000Z", result: { status: "bad" } };
    const out = normalizeHandoffRecord(JSON.parse(JSON.stringify(h)));
    expect(out.consumedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(out.result).toBe(null);
  });

  it("returns null for malformed records", () => {
    expect(normalizeHandoffRecord(null)).toBe(null);
    expect(normalizeHandoffRecord("x")).toBe(null);
    expect(normalizeHandoffRecord({})).toBe(null);
    expect(normalizeHandoffRecord({ ...make(), id: "" })).toBe(null);
    expect(normalizeHandoffRecord({ ...make(), task: { title: "" } })).toBe(null);
  });
});

describe("summarizeResults", () => {
  it("aggregates two sessions to 2 sessions and 50 min", () => {
    const a = { ...make(), result: { status: "completed", minutes: 20, reflection: "first" } };
    const b = { ...make(), createdAt: "2024-01-02T00:00:00.000Z", result: { status: "abandoned", minutes: 30, reflection: "second" } };
    expect(summarizeResults([b, a])).toEqual({ sessions: 2, minutes: 50, completed: 1, lastReflection: "second" });
  });

  it("is null when nothing has a result", () => {
    expect(summarizeResults([make()])).toBe(null);
    expect(summarizeResults([])).toBe(null);
    expect(summarizeResults(undefined)).toBe(null);
  });
});

describe("normalizeOutput / result output", () => {
  it("keeps trimmed text and a capped, cleaned item list", () => {
    expect(normalizeOutput({ text: "  a note ", items: ["  one  ", "", "two\nlines", 7] })).toEqual({
      text: "a note",
      items: [{ title: "one" }, { title: "two lines" }],
    });
    const many = Array.from({ length: 30 }, (_, i) => `step ${i}`);
    expect(normalizeOutput({ items: many }).items).toHaveLength(12);
    expect(normalizeOutput({ items: ["x".repeat(500)] }).items[0].title).toHaveLength(200);
  });
  it("carries decision steps", () => {
    expect(normalizeOutput({ items: [{ title: "Pick", decision: { options: ["a", "b"] } }] }).items).toEqual([
      { title: "Pick", decision: { options: ["a", "b"] } },
    ]);
  });
  it("keeps an optional ordered plan on the task", () => {
    const h = make({ ...valid(), task: { title: "Run it", steps: ["a", { title: "b", decision: {} }, ""] } });
    expect(h.task.steps).toEqual([{ title: "a" }, { title: "b", decision: { options: [] } }]);
    expect(make().task.steps).toBeUndefined();
  });
  it("is null when nothing usable remains", () => {
    expect(normalizeOutput(null)).toBe(null);
    expect(normalizeOutput({})).toBe(null);
    expect(normalizeOutput({ text: "  ", items: ["", "  "] })).toBe(null);
    expect(normalizeOutput("junk")).toBe(null);
  });
  it("rides on a result and is omitted when empty", () => {
    expect(normalizeResult({ status: "completed", minutes: 3, output: { items: ["a", "b"] } })).toEqual({
      status: "completed",
      minutes: 3,
      output: { items: [{ title: "a" }, { title: "b" }] },
    });
    expect(normalizeResult({ status: "completed", minutes: 3, output: { items: [] } })).toEqual({
      status: "completed",
      minutes: 3,
    });
  });
});

describe("decompose handoffs", () => {
  const decompose = () => ({
    from: { tool: "focus", ref: "12" },
    to: { tool: "thinkpad", intent: "decompose" },
    task: { title: "Ship the timer UI change", notes: "Mindstream â€º Fix timer bug" },
  });
  it("is accepted only by thinkpad", () => {
    expect(make(decompose())).not.toBe(null);
    expect(make({ ...decompose(), to: { tool: "focus", intent: "decompose" } })).toBe(null);
  });
  it("keeps an optional target ref across a stored record", () => {
    const record = { ...make(decompose()), to: { tool: "thinkpad", intent: "decompose", ref: "pad:9" } };
    expect(normalizeHandoffRecord(record).to.ref).toBe("pad:9");
    expect(normalizeHandoffRecord({ ...record, to: { ...record.to, ref: 5 } }).to.ref).toBeUndefined();
  });
});
