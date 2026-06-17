import { describe, expect, it } from "vitest";
import {
  createPad,
  addRootThread,
  setResumeHint,
  setTitle,
  setThinkPadText,
  addThinkPadAnnotation,
} from "./padDomain";
import { makeTestEnv } from "./__testkit__";

describe("createPad", () => {
  it("starts with empty threads and 'new' state", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "Fix auth bug", now: env.now }, env);
    expect(pad.title).toBe("Fix auth bug");
    expect(pad.threads).toEqual([]);
    expect(pad.state).toBe("new");
    expect(pad.id).toMatch(/^pad:/);
    expect(pad.config.timing.timeboxMinutes).toBe(10);
    expect(pad).not.toHaveProperty("log");
  });

  it("transitions to 'active' once a root thread is pushed", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const { pad: next } = addRootThread(pad, { title: "step" }, env);
    expect(next.state).toBe("active");
  });

  it("is deterministic — same inputs yield identical output (no ambient effects)", () => {
    const a = createPad({ title: "same", now: "2026-01-01T00:00:00.000Z" }, makeTestEnv());
    const b = createPad({ title: "same", now: "2026-01-01T00:00:00.000Z" }, makeTestEnv());
    expect(a).toEqual(b);
    expect(a.id).toBe("pad:1");
    expect(a.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("addRootThread", () => {
  it("pushes a one-step root thread", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const { pad: next, pushed } = addRootThread(pad, { title: "Reproduce" }, env);
    expect(pushed.steps[0].title).toBe("Reproduce");
    expect(next.threads).toHaveLength(1);
    expect(next.state).toBe("active");
  });
});

describe("pad-level metadata", () => {
  it("setResumeHint stores the hint", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "x", now: env.now }, env);
    pad = setResumeHint(pad, "  picking up after lunch ", env);
    expect(pad.resumeHint).toBe("picking up after lunch");
  });

  it("setTitle updates the pad title", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "old", now: env.now }, env);
    pad = setTitle(pad, "new title", env);
    expect(pad.title).toBe("new title");
  });
});

describe("setThinkPadText", () => {
  it("updates doc.text immutably", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const next = setThinkPadText(pad, "my notes", env);
    expect(next).not.toBe(pad);
    expect(next.doc.text).toBe("my notes");
    expect(pad.doc.text).toBe("");
  });

  it("is a no-op if text is unchanged", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const a = setThinkPadText(pad, "hello", env);
    const b = setThinkPadText(a, "hello", env);
    expect(b).toBe(a);
  });

  it("handles non-string input gracefully (null coerces to '' — no-op on empty pad)", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const next = setThinkPadText(pad, null, env);
    expect(next).toBe(pad);
    expect(next.doc.text).toBe("");
  });

  it("preserves existing annotations", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const withText = setThinkPadText(pad, "draft", env);
    const withAnnotation = addThinkPadAnnotation(withText, {
      id: "ann:1",
      selectionStart: 0,
      selectionEnd: 5,
      selectedText: "draft",
      stepId: "step:1",
      stepTitle: "A step",
      createdAt: "2026-01-01T00:00:00.000Z",
    }, env);
    const updated = setThinkPadText(withAnnotation, "updated", env);
    expect(updated.doc.annotations).toHaveLength(1);
  });
});

describe("addThinkPadAnnotation", () => {
  const baseAnnotation = {
    id: "ann:1",
    selectionStart: 0,
    selectionEnd: 10,
    selectedText: "some text",
    stepId: "step:1",
    stepTitle: "A step",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("appends a valid annotation immutably", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const next = addThinkPadAnnotation(pad, baseAnnotation, env);
    expect(next).not.toBe(pad);
    expect(next.doc.annotations).toHaveLength(1);
    expect(next.doc.annotations[0].id).toBe("ann:1");
    expect(pad.doc.annotations).toHaveLength(0);
  });

  it("rejects annotation where selectionStart >= selectionEnd", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const bad = { ...baseAnnotation, selectionStart: 5, selectionEnd: 5 };
    const next = addThinkPadAnnotation(pad, bad, env);
    expect(next).toBe(pad);
  });

  it("rejects annotation with missing id", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const bad = { ...baseAnnotation, id: "" };
    const next = addThinkPadAnnotation(pad, bad, env);
    expect(next).toBe(pad);
  });

  it("rejects annotation with missing stepId", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const bad = { ...baseAnnotation, stepId: "" };
    const next = addThinkPadAnnotation(pad, bad, env);
    expect(next).toBe(pad);
  });

  it("accumulates multiple annotations", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "x", now: env.now }, env);
    const ann1 = { ...baseAnnotation, id: "ann:1" };
    const ann2 = { ...baseAnnotation, id: "ann:2", selectionStart: 10, selectionEnd: 20 };
    const next = addThinkPadAnnotation(addThinkPadAnnotation(pad, ann1, env), ann2, env);
    expect(next.doc.annotations).toHaveLength(2);
  });
});
