// ---------------------------------------------------------------------------
// Synthesize with quoting (roadmap Revisions 19 to 22).
//
// A synthesis is a thread opened on the whole draft of a level. Inside it you
// quote passages in: a copy with a snapshot link back to where it came from.
// Resolving replaces the whole draft with the thesis. Threads still open in the
// draft must be acknowledged first (not resolved); they are then kept and
// re-anchored to the thesis, remembering the passage they were opened on, and
// their later results are added beside the thesis.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  padForThread,
  enterReflect,
  drillIntoSpan,
  stageStepOutput,
  setStepOutput,
  advanceToNextDraft,
  resolveThreadIntoParent,
  openItems,
  drillThreadsAt,
  linksAt,
  startSynthesis,
  quoteInto,
  synthesisToAcknowledge,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

const DUMP = "Overload matters most.\n\nVolume drives growth.\n\nBad knee: deep squats hurt.";
const root = (pad) => padForThread(pad, null);

function reflecting(env) {
  let pad = createPad({ title: "How do I build a program?", now: env.now }, env);
  pad = setPadText(pad, { text: DUMP }, env);
  return enterReflect(pad, {}, env);
}

function withOpenKneeThread(env) {
  const pad = reflecting(env);
  const start = DUMP.indexOf("Bad knee");
  const d = drillIntoSpan(pad, {
    parentThreadId: null, title: "Which lifts spare the knee?", selectionStart: start,
    selectionEnd: start + "Bad knee".length, selectedText: "Bad knee",
  }, env);
  return { pad: setPadText(d.pad, { padLocator: d.frame.id, text: "split squats\n\nleg curls" }, env), knee: d.frame, kneeAnn: d.annotationId };
}

describe("startSynthesis", () => {
  it("opens a thread anchored on the whole draft, marked as a synthesis", () => {
    const env = makeTestEnv();
    const { pad, frame } = startSynthesis(reflecting(env), {}, env);
    expect(frame.synthesis).toBe(true);
    const ann = root(pad).annotations.find((a) => a.id === frame.parentAnchor.annotationId);
    expect(ann).toMatchObject({ selectionStart: 0, selectionEnd: DUMP.length, synthesis: true });
  });

  it("returns the existing open synthesis instead of starting a second", () => {
    const env = makeTestEnv();
    const first = startSynthesis(reflecting(env), {}, env);
    const again = startSynthesis(first.pad, {}, env);
    expect(again.pad).toBe(first.pad);
    expect(again.frame.id).toBe(first.frame.id);
  });

  it("needs Reflect and some text (no-op otherwise)", () => {
    const env = makeTestEnv();
    let writing = createPad({ title: "x", now: env.now }, env);
    writing = setPadText(writing, { text: DUMP }, env);
    expect(startSynthesis(writing, {}, env).frame).toBeNull();
  });
});

describe("quoteInto", () => {
  it("copies a parent paragraph into the synthesis with a snapshot link back", () => {
    const env = makeTestEnv();
    let { pad, frame } = startSynthesis(reflecting(env), {}, env);
    pad = setPadText(pad, { padLocator: frame.id, text: "# Drivers of growth" }, env);
    const source = root(pad).ideas[1];
    pad = quoteInto(pad, { threadId: frame.id, sourceIdeaId: source.id }, env);
    expect(padForThread(pad, frame.id).text).toBe("# Drivers of growth\n\nVolume drives growth.");
    expect(linksAt(pad, frame.id)).toEqual([
      expect.objectContaining({ kind: "passage", quote: true, snapshot: "Volume drives growth.", draftN: 0, refined: false }),
    ]);
  });

  it("allows the same passage under two themes (redundancy)", () => {
    const env = makeTestEnv();
    let { pad, frame } = startSynthesis(reflecting(env), {}, env);
    const source = root(pad).ideas[0];
    pad = quoteInto(pad, { threadId: frame.id, sourceIdeaId: source.id }, env);
    pad = setPadText(pad, { padLocator: frame.id, text: `${padForThread(pad, frame.id).text}\n\n# Another theme` }, env);
    pad = quoteInto(pad, { threadId: frame.id, sourceIdeaId: source.id }, env);
    expect(linksAt(pad, frame.id)).toHaveLength(2);
  });

  it("is a no-op for a thread that is not a synthesis, or an unknown source", () => {
    const env = makeTestEnv();
    const { pad, knee } = withOpenKneeThread(env);
    expect(quoteInto(pad, { threadId: knee.id, sourceIdeaId: root(pad).ideas[0].id }, env)).toBe(pad);
    const s = startSynthesis(pad, {}, env);
    expect(quoteInto(s.pad, { threadId: s.frame.id, sourceIdeaId: "nope" }, env)).toBe(s.pad);
  });
});

describe("synthesisToAcknowledge", () => {
  it("lists the threads still open in the draft, not the synthesis itself", () => {
    const env = makeTestEnv();
    const { pad, kneeAnn } = withOpenKneeThread(env);
    const s = startSynthesis(pad, {}, env);
    expect(synthesisToAcknowledge(s.pad, s.frame.id).map((i) => i.id)).toEqual([kneeAnn]);
  });
});

describe("resolving a synthesis", () => {
  function synthesize(env, { staged }) {
    const base = withOpenKneeThread(env);
    let { pad, frame } = startSynthesis(base.pad, {}, env);
    pad = setPadText(pad, { padLocator: frame.id, text: "Four-day upper/lower, progress weekly, knee-friendly legs." }, env);
    if (staged) {
      const step = frame.steps[0];
      pad = setStepOutput(pad, { stepId: step.id, output: "Four-day upper/lower, progress weekly, knee-friendly legs." }, env);
      pad = stageStepOutput(pad, { stepId: step.id, annotationId: frame.parentAnchor.annotationId, text: "Four-day upper/lower, progress weekly, knee-friendly legs." }, env);
      pad = advanceToNextDraft(pad, {}, env);
    } else {
      pad = resolveThreadIntoParent(pad, { threadId: frame.id, result: "Four-day upper/lower, progress weekly, knee-friendly legs." }, env).pad;
    }
    return { ...base, pad, synth: frame };
  }

  for (const staged of [true, false]) {
    it(`replaces the draft and re-anchors open threads to the thesis (${staged ? "via Next Draft" : "direct"})`, () => {
      const env = makeTestEnv();
      const { pad, kneeAnn } = synthesize(env, { staged });
      const thesis = "Four-day upper/lower, progress weekly, knee-friendly legs.";
      expect(root(pad).text).toBe(thesis);
      const knee = root(pad).annotations.find((a) => a.id === kneeAnn);
      expect(knee).toMatchObject({ selectionStart: 0, selectionEnd: thesis.length, selectedText: thesis, originalText: "Bad knee", writeBack: "annotate" });
      expect(knee.lost).toBeFalsy();
      expect(openItems(pad, null).map((i) => i.id)).toEqual([kneeAnn]); // still open, now under the thesis
      const listed = drillThreadsAt(pad, null).find((t) => t.annotationId === kneeAnn);
      expect(listed.anchorText).toBe("Bad knee"); // shows the passage it was opened on
    });
  }

  it("a re-anchored thread's result is added beside the thesis, not over it", () => {
    const env = makeTestEnv();
    const { pad, knee } = synthesize(env, { staged: false });
    const after = resolveThreadIntoParent(pad, { threadId: knee.id, result: "Legs: split squats and leg curls." }, env).pad;
    const text = root(after).text;
    expect(text.startsWith("Four-day upper/lower, progress weekly, knee-friendly legs.")).toBe(true);
    expect(text).toContain("Legs: split squats and leg curls.");
  });

  it("the synthesis thread keeps its quotes as evidence, pointing at the draft they came from", () => {
    const env = makeTestEnv();
    const base = withOpenKneeThread(env);
    let { pad, frame } = startSynthesis(base.pad, {}, env);
    pad = quoteInto(pad, { threadId: frame.id, sourceIdeaId: root(pad).ideas[0].id }, env);
    pad = resolveThreadIntoParent(pad, { threadId: frame.id, result: "Progressive overload of weekly volume." }, env).pad;
    expect(linksAt(pad, frame.id)[0]).toMatchObject({ snapshot: "Overload matters most.", draftN: 0, lost: true });
  });

  it("survives save and load", () => {
    const env = makeTestEnv();
    const { pad, kneeAnn, synth } = synthesize(env, { staged: false });
    const loaded = normalizePad(JSON.parse(JSON.stringify(buildPadSnapshot(pad))), { now: env.now });
    expect(root(loaded).annotations.find((a) => a.id === kneeAnn)).toMatchObject({ originalText: "Bad knee", writeBack: "annotate" });
    expect(loaded.threads.find((t) => t.id === synth.id).synthesis).toBe(true);
  });
});
