import { describe, expect, it } from "vitest";
import {
  createPad,
  createStep,
  reorderBlock,
  stampDraft,
  findStepDeep,
  setThinkPadText,
  promoteSpanToMove,
  captureIdea,
  performMoveOnIdea,
  ideasForPanel,
  setStepOutput,
  resolveStepIntoDocument,
  updateThinkPadAnnotation,
  getContextMoves,
} from "./padDomain";
import {
  normalizePad,
  buildPadSnapshot,
} from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

// "fix the bug here" — "the bug" occupies [4,11)
const DOC = "fix the bug here";

function scratchWithSpan() {
  const env = makeTestEnv();
  let pad = createPad({ title: "demo", now: env.now }, env);
  pad = setThinkPadText(pad, DOC, env);
  const { pad: context, step, annotationId } = promoteSpanToMove(pad, {
    title: "investigate the failure",
    selectionStart: 4,
    selectionEnd: 11,
    selectedText: "the bug",
    stepId: "step:a",
    annotationId: "ann:a",
  }, env);
  return { pad: context, step, annotationId, env };
}

describe("new entity fields", () => {
  it("createStep carries an empty output", () => {
    expect(createStep({ title: "x" }, makeTestEnv()).output).toBe("");
  });
});

describe("promoteSpanToMove", () => {
  it("first promotion on an empty stack creates the hosting frame + step", () => {
    const { pad, step } = scratchWithSpan();
    expect(pad.threads).toHaveLength(1);
    expect(pad.threads[0].steps).toHaveLength(1);
    expect(pad.threads[0].steps[0].id).toBe(step.id);
    expect(step.output).toBe("");
  });

  it("the authored title is distinct from the highlighted anchor text", () => {
    const { pad, step } = scratchWithSpan();
    const ann = pad.doc.annotations[0];
    expect(step.title).toBe("investigate the failure");
    expect(ann.selectedText).toBe("the bug");
    expect(ann.stepTitle).toBe("investigate the failure");
    expect(ann.stepTitle).not.toBe(ann.selectedText);
    expect(ann.resolved).toBe(false);
    expect(ann.placement).toBe("anchored");
  });

  it("a second promotion creates a SIBLING thread (own frame, flat, not nested)", () => {
    let { pad, env } = scratchWithSpan();
    ({ pad } = promoteSpanToMove(pad, {
      title: "second move", selectionStart: 12, selectionEnd: 16, selectedText: "here",
    }, env));
    expect(pad.threads.every((f) => (f.subThreads ?? []).length === 0)).toBe(true); // siblings stay flat — nesting is reserved for drill-down
    expect(pad.threads).toHaveLength(2); // each thought is its OWN root frame, not a step in a shared one
    expect(pad.threads.every((f) => f.steps.length === 1)).toBe(true);
    expect(pad.doc.annotations).toHaveLength(2);
  });

  it("is a no-op on an empty title or invalid range", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "x", now: env.now }, env);
    pad = setThinkPadText(pad, DOC, env);
    expect(promoteSpanToMove(pad, { title: "  ", selectionStart: 0, selectionEnd: 3 }, env).step).toBeNull();
    expect(promoteSpanToMove(pad, { title: "ok", selectionStart: 5, selectionEnd: 5 }, env).pad).toBe(pad);
  });
});

describe("setStepOutput", () => {
  it("sets a step's output by id and no-ops when unchanged or unknown", () => {
    let { pad, env } = scratchWithSpan();
    pad = setStepOutput(pad, { stepId: "step:a", output: "done" }, env);
    expect(findStepDeep(pad, "step:a").output).toBe("done");
    expect(setStepOutput(pad, { stepId: "step:a", output: "done" }, env)).toBe(pad);
    expect(setStepOutput(pad, { stepId: "nope", output: "x" }, env)).toBe(pad);
  });
});

describe("resolveStepIntoDocument (keystone)", () => {
  it("splices output into the document at the exact anchor", () => {
    let { pad, env } = scratchWithSpan();
    pad = setStepOutput(pad, { stepId: "step:a", output: "RESOLVED" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("fix RESOLVED here");
    const ann = pad.doc.annotations[0];
    expect(ann.resolved).toBe(true);
    expect(ann.placement).toBe("anchored");
    expect(ann.selectedText).toBe("RESOLVED");
    expect(pad.doc.text.slice(ann.selectionStart, ann.selectionEnd)).toBe("RESOLVED");
  });

  it("re-finds the anchor by text when offsets have drifted", () => {
    let { pad, env } = scratchWithSpan();
    // Prepend text so the stored offsets [4,11) no longer point at "the bug".
    pad = setThinkPadText(pad, "PREFIX " + DOC, env);
    pad = setStepOutput(pad, { stepId: "step:a", output: "X" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("PREFIX fix X here");
    expect(pad.doc.annotations[0].placement).toBe("anchored");
  });

  it("appends the output with a 'couldn't place' flag when the anchor is gone", () => {
    let { pad, env } = scratchWithSpan();
    pad = setStepOutput(pad, { stepId: "step:a", output: "DONE" }, env);
    pad = setThinkPadText(pad, "totally different now", env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("totally different now\nDONE");
    expect(pad.doc.annotations[0].placement).toBe("appended");
    expect(pad.doc.annotations[0].resolved).toBe(true);
  });

  it("shifts trailing annotations by delta so later write-backs still land", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "x", now: env.now }, env);
    pad = setThinkPadText(pad, "alpha beta gamma", env);
    ({ pad } = promoteSpanToMove(pad, {
      title: "do alpha", selectionStart: 0, selectionEnd: 5, selectedText: "alpha", stepId: "step:a", annotationId: "ann:a",
    }, env));
    ({ pad } = promoteSpanToMove(pad, {
      title: "do gamma", selectionStart: 11, selectionEnd: 16, selectedText: "gamma", stepId: "step:b", annotationId: "ann:b",
    }, env));
    // Resolve A with a LONGER output → "gamma" must shift right.
    pad = setStepOutput(pad, { stepId: "step:a", output: "AAAAAAAA" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("AAAAAAAA beta gamma");
    const annB = pad.doc.annotations.find((a) => a.id === "ann:b");
    expect(pad.doc.text.slice(annB.selectionStart, annB.selectionEnd)).toBe("gamma");
    // Now resolve B — it should land on the shifted anchor.
    pad = setStepOutput(pad, { stepId: "step:b", output: "GG" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:b", ...env });
    expect(pad.doc.text).toBe("AAAAAAAA beta GG");
  });

  it("is a no-op for empty output and idempotent once resolved", () => {
    let { pad, env } = scratchWithSpan();
    expect(resolveStepIntoDocument(pad, { stepId: "step:a", ...env })).toBe(pad); // no output yet
    pad = setStepOutput(pad, { stepId: "step:a", output: "ONCE" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    const afterFirst = pad.doc.text;
    expect(resolveStepIntoDocument(pad, { stepId: "step:a", ...env })).toBe(pad); // already resolved → no-op
    expect(pad.doc.text).toBe(afterFirst);
  });
});

describe("moves: write-back modes + tagging", () => {
  function promoteWithMove(overrides) {
    const env = makeTestEnv();
    let pad = createPad({ title: "demo", now: env.now }, env);
    pad = setThinkPadText(pad, DOC, env);
    const { pad: context } = promoteSpanToMove(pad, {
      title: "Why might this be wrong?",
      selectionStart: 4,
      selectionEnd: 11,
      selectedText: "the bug",
      stepId: "step:a",
      annotationId: "ann:a",
      ...overrides,
    }, env);
    return { pad: context, env };
  }

  it("carries the move id and write-back mode onto the anchor", () => {
    const { pad } = promoteWithMove({ move: "doubt", writeBack: "annotate" });
    const ann = pad.doc.annotations[0];
    expect(ann.move).toBe("doubt");
    expect(ann.writeBack).toBe("annotate");
  });

  it("defaults to a freeform replace when no move is given", () => {
    const { pad } = scratchWithSpan();
    const ann = pad.doc.annotations[0];
    expect(ann.move).toBe("");
    expect(ann.writeBack).toBe("replace");
  });

  it("ANNOTATE keeps the motivating text and inserts the insight beside it", () => {
    let { pad, env } = promoteWithMove({ move: "doubt", writeBack: "annotate" });
    pad = setStepOutput(pad, { stepId: "step:a", output: "MAYBE NOT" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    // Original "the bug" survives; the insight lands on its own line after it.
    expect(pad.doc.text).toBe("fix the bug\nMAYBE NOT\n here");
    expect(pad.doc.text).toContain("the bug");
    const ann = pad.doc.annotations[0];
    expect(ann.placement).toBe("annotated");
    expect(ann.resolved).toBe(true);
    expect(ann.selectedText).toBe("MAYBE NOT");
    expect(pad.doc.text.slice(ann.selectionStart, ann.selectionEnd)).toBe("MAYBE NOT");
  });

  it("REPLACE (default) still overwrites the anchor span", () => {
    let { pad, env } = promoteWithMove({ move: "clarify", writeBack: "replace" });
    pad = setStepOutput(pad, { stepId: "step:a", output: "the crash" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("fix the crash here");
    expect(pad.doc.annotations[0].placement).toBe("anchored");
  });

  it("an ANNOTATE insert shifts trailing anchors so later write-backs still land", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "x", now: env.now }, env);
    pad = setThinkPadText(pad, "alpha beta gamma", env);
    ({ pad } = promoteSpanToMove(pad, {
      title: "doubt alpha", selectionStart: 0, selectionEnd: 5, selectedText: "alpha",
      stepId: "step:a", annotationId: "ann:a", move: "doubt", writeBack: "annotate",
    }, env));
    ({ pad } = promoteSpanToMove(pad, {
      title: "do gamma", selectionStart: 11, selectionEnd: 16, selectedText: "gamma",
      stepId: "step:b", annotationId: "ann:b",
    }, env));
    pad = setStepOutput(pad, { stepId: "step:a", output: "NOPE" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    // "alpha" kept; "NOPE" inserted after it → "gamma" anchor must shift right.
    const annB = pad.doc.annotations.find((a) => a.id === "ann:b");
    expect(pad.doc.text.slice(annB.selectionStart, annB.selectionEnd)).toBe("gamma");
    pad = setStepOutput(pad, { stepId: "step:b", output: "GG" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:b", ...env });
    expect(pad.doc.text).toContain("GG");
    expect(pad.doc.text).toContain("alpha"); // the doubted text was never destroyed
  });

  it("getContextMoves surfaces the move id and the original source", () => {
    let { pad, env } = promoteWithMove({ move: "doubt", writeBack: "annotate" });
    pad = setStepOutput(pad, { stepId: "step:a", output: "MAYBE NOT" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    const insights = getContextMoves(pad);
    expect(insights).toHaveLength(1);
    expect(insights[0].move).toBe("doubt");
    expect(insights[0].source).toBe("the bug");
    expect(insights[0].output).toBe("MAYBE NOT");
  });

  it("round-trips move, writeBack, and source through persistence", () => {
    let { pad, env } = promoteWithMove({ move: "support", writeBack: "annotate" });
    pad = setStepOutput(pad, { stepId: "step:a", output: "because X" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    const restored = normalizePad(buildPadSnapshot(pad, { now: env.now }), { now: env.now });
    const ann = restored.doc.annotations[0];
    expect(ann.move).toBe("support");
    expect(ann.writeBack).toBe("annotate");
    expect(ann.source).toBe("the bug");
    expect(ann.placement).toBe("annotated");
  });
});

describe("updateThinkPadAnnotation", () => {
  it("patches a single annotation by id and no-ops on unknown id", () => {
    let { pad, env } = scratchWithSpan();
    pad = updateThinkPadAnnotation(pad, "ann:a", { resolved: true }, env);
    expect(pad.doc.annotations[0].resolved).toBe(true);
    expect(updateThinkPadAnnotation(pad, "ann:nope", { resolved: false }, env)).toBe(pad);
  });
});

describe("persistence round-trip (additive fields)", () => {
  it("round-trips output and resolved-annotation fields", () => {
    let { pad, env } = scratchWithSpan();
    pad = setStepOutput(pad, { stepId: "step:a", output: "RESOLVED" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });

    const restored = normalizePad(buildPadSnapshot(pad, { now: env.now }), { now: env.now });
    expect(findStepDeep(restored, "step:a").output).toBe("RESOLVED");
    const ann = restored.doc.annotations[0];
    expect(ann.resolved).toBe(true);
    expect(ann.placement).toBe("anchored");
    expect(typeof ann.resolvedAt).toBe("string");
  });

  it("defaults the new fields when an older v9 record lacks them", () => {
    const restored = normalizePad({
      id: "ctx:old",
      threads: [{ id: "f1", steps: [{ id: "s1", title: "legacy step" }] }],
      doc: {
        text: "x y",
        annotations: [{ id: "ann:1", selectionStart: 0, selectionEnd: 1, stepId: "s1", selectedText: "x" }],
      },
    }, { now: "2026-01-01T00:00:00.000Z" });
    expect(restored.threads[0].steps[0].output).toBe("");
    expect(restored.doc.annotations[0].resolved).toBe(false);
    expect(restored.doc.annotations[0].placement).toBe("anchored");
    expect(restored.doc.annotations[0].resolvedAt).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// Ideas: the park/perform split. captureIdea parks a span as an intent-less
// annotation (stepId === null, no commitment); performMoveOnIdea is the
// deferred twin of promoteSpanToMove that turns a parked idea into a worked
// thread. Insights stay = resolved (performed) moves — unchanged.
// ---------------------------------------------------------------------------

describe("captureIdea (park — no step, no commitment)", () => {
  it("parks a span as an idea with no step and no move performed", () => {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "demo", now: env.now }, env), DOC, env);
    const { pad: context, ideaId } = captureIdea(pad, {
      selectionStart: 4, selectionEnd: 11, selectedText: "the bug", ideaId: "idea:a",
    }, env);
    pad = context;
    expect(ideaId).toBe("idea:a");
    const idea = pad.doc.annotations[0];
    expect(idea.stepId).toBeNull();    // parked: the single signal — no thread
    expect(idea.move).toBe("");        // no move performed
    expect(idea.resolved).toBe(false);
    expect(idea.intent).toBeNull();    // intent-less by default
    expect(idea.selectedText).toBe("the bug");
    expect(pad.threads).toHaveLength(0); // parking NEVER spawns a thread
  });

  it("coerces an unknown intent to null and keeps a valid one", () => {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), DOC, env);
    pad = captureIdea(pad, { selectionStart: 0, selectionEnd: 3, intent: "NONSENSE", ideaId: "i1" }, env).pad;
    pad = captureIdea(pad, { selectionStart: 4, selectionEnd: 11, intent: "DOUBT", ideaId: "i2" }, env).pad;
    expect(pad.doc.annotations.find((a) => a.id === "i1").intent).toBeNull();
    expect(pad.doc.annotations.find((a) => a.id === "i2").intent).toBe("DOUBT");
  });

  it("is a no-op on an invalid range", () => {
    const env = makeTestEnv();
    const pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), DOC, env);
    const res = captureIdea(pad, { selectionStart: 5, selectionEnd: 5 }, env);
    expect(res.pad).toBe(pad);
    expect(res.ideaId).toBeNull();
  });

  it("a parked idea never appears as an insight (only resolved moves do)", () => {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), DOC, env);
    pad = captureIdea(pad, { selectionStart: 4, selectionEnd: 11, selectedText: "the bug", ideaId: "idea:a" }, env).pad;
    expect(getContextMoves(pad)).toEqual([]);
  });
});

describe("performMoveOnIdea (park → worked thread)", () => {
  function parked() {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), DOC, env);
    pad = captureIdea(pad, { selectionStart: 4, selectionEnd: 11, selectedText: "the bug", ideaId: "idea:a" }, env).pad;
    return { pad, env };
  }

  it("spins up an independent sibling thread and stamps the move onto the idea", () => {
    let { pad, env } = parked();
    const { pad: context, step } = performMoveOnIdea(pad, "idea:a", {
      title: "Why might this be wrong?", move: "doubt", writeBack: "annotate", stepId: "step:a",
    }, env);
    pad = context;
    expect(step.id).toBe("step:a");
    expect(pad.threads).toHaveLength(1); // a thread now exists
    const idea = pad.doc.annotations[0];
    expect(idea.stepId).toBe("step:a");  // no longer parked
    expect(idea.move).toBe("doubt");
    expect(idea.writeBack).toBe("annotate");
    expect(idea.stepTitle).toBe("Why might this be wrong?");
    expect(idea.selectedText).toBe("the bug"); // anchor preserved
  });

  it("resolves into the document exactly like a promoted move (insight = performed move)", () => {
    let { pad, env } = parked();
    pad = performMoveOnIdea(pad, "idea:a", { title: "clarify it", move: "clarify", writeBack: "replace", stepId: "step:a" }, env).pad;
    pad = setStepOutput(pad, { stepId: "step:a", output: "the crash" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:a", ...env });
    expect(pad.doc.text).toBe("fix the crash here");
    const insights = getContextMoves(pad);
    expect(insights).toHaveLength(1);    // resolved → now an insight
    expect(insights[0].move).toBe("clarify");
    expect(insights[0].source).toBe("the bug");
  });

  it("no-ops on unknown id, blank title, or an already-worked idea", () => {
    let { pad, env } = parked();
    expect(performMoveOnIdea(pad, "nope", { title: "x" }, env).step).toBeNull();
    expect(performMoveOnIdea(pad, "idea:a", { title: "  " }, env).step).toBeNull();
    const worked = performMoveOnIdea(pad, "idea:a", { title: "first", stepId: "s1" }, env).pad;
    expect(performMoveOnIdea(worked, "idea:a", { title: "second" }, env).step).toBeNull();
  });
});

describe("ideasForPanel (one unified list, three derived states)", () => {
  it("projects parked, active, and resolved ideas each with the right state", () => {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), "alpha beta gamma", env);
    // active: captured then a move performed (not resolved)
    pad = captureIdea(pad, { selectionStart: 0, selectionEnd: 5, selectedText: "alpha", ideaId: "idea:active" }, env).pad;
    pad = performMoveOnIdea(pad, "idea:active", { title: "work alpha", move: "clarify", stepId: "step:active" }, env).pad;
    // resolved: captured, move performed, output written back
    pad = captureIdea(pad, { selectionStart: 6, selectionEnd: 10, selectedText: "beta", ideaId: "idea:done" }, env).pad;
    pad = performMoveOnIdea(pad, "idea:done", { title: "work beta", move: "resolve", writeBack: "replace", stepId: "step:done" }, env).pad;
    pad = setStepOutput(pad, { stepId: "step:done", output: "BETA" }, env);
    pad = resolveStepIntoDocument(pad, { stepId: "step:done", ...env });
    // parked: captured only
    pad = captureIdea(pad, { selectionStart: 11, selectionEnd: 16, selectedText: "gamma", ideaId: "idea:parked" }, env).pad;

    const byId = Object.fromEntries(ideasForPanel(pad).map((r) => [r.ideaId, r]));
    expect(byId["idea:active"].state).toBe("active");
    expect(byId["idea:active"].frameId).not.toBeNull();
    expect(byId["idea:done"].state).toBe("resolved");
    expect(byId["idea:done"].move).toBe("resolve");
    expect(byId["idea:parked"].state).toBe("parked");
    expect(byId["idea:parked"].frameId).toBeNull();
    expect(byId["idea:parked"].stepId).toBeNull();
  });

  it("returns [] for a pad with no ideas", () => {
    const env = makeTestEnv();
    expect(ideasForPanel(createPad({ title: "x", now: env.now }, env))).toEqual([]);
  });
});

describe("parked-idea persistence", () => {
  it("round-trips a parked idea (null stepId, intent, note) — not dropped for lacking a step", () => {
    const env = makeTestEnv();
    let pad = setThinkPadText(createPad({ title: "x", now: env.now }, env), DOC, env);
    pad = captureIdea(pad, {
      selectionStart: 4, selectionEnd: 11, selectedText: "the bug",
      intent: "DOUBT", note: "feels off", ideaId: "idea:a",
    }, env).pad;
    const restored = normalizePad(buildPadSnapshot(pad, { now: env.now }), { now: env.now });
    const idea = restored.doc.annotations[0];
    expect(idea.stepId).toBeNull();
    expect(idea.intent).toBe("DOUBT");
    expect(idea.note).toBe("feels off");
    expect(idea.resolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderBlock
// ---------------------------------------------------------------------------

describe("reorderBlock", () => {
  function padWithText(text) {
    const env = makeTestEnv();
    let pad = createPad({ title: "test", now: env.now }, env);
    pad = setThinkPadText(pad, text, env);
    return { pad, env };
  }

  it("returns same reference when fromIdx === toIdx", () => {
    const { pad, env } = padWithText("A\n\nB\n\nC");
    const result = reorderBlock(pad, { fromIdx: 1, toIdx: 1 }, env);
    expect(result).toBe(pad);
  });

  it("returns same reference for out-of-bounds fromIdx", () => {
    const { pad, env } = padWithText("A\n\nB");
    const result = reorderBlock(pad, { fromIdx: 5, toIdx: 0 }, env);
    expect(result).toBe(pad);
  });

  it("moves the first block to the end", () => {
    const { pad, env } = padWithText("A\n\nB\n\nC");
    const result = reorderBlock(pad, { fromIdx: 0, toIdx: 2 }, env);
    expect(result.doc.text).toBe("B\n\nC\n\nA");
  });

  it("moves the last block to the start", () => {
    const { pad, env } = padWithText("A\n\nB\n\nC");
    const result = reorderBlock(pad, { fromIdx: 2, toIdx: 0 }, env);
    expect(result.doc.text).toBe("C\n\nA\n\nB");
  });

  it("moves a middle block one step up", () => {
    const { pad, env } = padWithText("A\n\nB\n\nC");
    const result = reorderBlock(pad, { fromIdx: 1, toIdx: 0 }, env);
    expect(result.doc.text).toBe("B\n\nA\n\nC");
  });

  it("remaps annotation offsets when the annotated block moves", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "test", now: env.now }, env);
    // "Alpha\n\nBeta\n\nGamma" — annotate "Beta" (start=7, end=11)
    pad = setThinkPadText(pad, "Alpha\n\nBeta\n\nGamma", env);
    const { pad: withAnn } = promoteSpanToMove(pad, {
      title: "think about Beta",
      selectionStart: 7,
      selectionEnd: 11,
      selectedText: "Beta",
    }, env);
    // Move "Beta" block (index 1) to index 0
    const result = reorderBlock(withAnn, { fromIdx: 1, toIdx: 0 }, env);
    expect(result.doc.text).toBe("Beta\n\nAlpha\n\nGamma");
    const ann = result.doc.annotations[0];
    // "Beta" is now at offset 0-4 in the reordered text
    expect(ann.selectionStart).toBe(0);
    expect(ann.selectionEnd).toBe(4);
  });

  it("leaves annotations in unmoved blocks at their original offsets", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "test", now: env.now }, env);
    // "Alpha\n\nBeta\n\nGamma" — annotate "Gamma" (start=13, end=18)
    pad = setThinkPadText(pad, "Alpha\n\nBeta\n\nGamma", env);
    const { pad: withAnn } = promoteSpanToMove(pad, {
      title: "think about Gamma",
      selectionStart: 13,
      selectionEnd: 18,
      selectedText: "Gamma",
    }, env);
    // Move "Alpha" block (index 0) to index 2 — Gamma is unmoved but shifts
    const result = reorderBlock(withAnn, { fromIdx: 0, toIdx: 2 }, env);
    expect(result.doc.text).toBe("Beta\n\nGamma\n\nAlpha");
    const ann = result.doc.annotations[0];
    // "Beta\n\nGamma\n\nAlpha" — "Gamma" is at 6–11
    expect(ann.selectionStart).toBe(6);
    expect(ann.selectionEnd).toBe(11);
  });

  it("also reorders frozenText in cultivate phase", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "test", now: env.now }, env);
    pad = setThinkPadText(pad, "A\n\nB\n\nC", env);
    const stamped = stampDraft(pad, {}, env);
    expect(stamped.doc.phase).toBe("cultivate");
    const result = reorderBlock(stamped, { fromIdx: 0, toIdx: 2 }, env);
    expect(result.doc.text).toBe("B\n\nC\n\nA");
    expect(result.doc.frozenText).toBe("B\n\nC\n\nA");
  });
});
