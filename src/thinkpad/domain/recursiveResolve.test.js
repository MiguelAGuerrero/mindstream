// ---------------------------------------------------------------------------
// Recursive-resolve contract — Slice 1 ("lock the model").
//
// Covers the additive model foundation: frame.doc / frame.parentAnchor /
// pad.surfaceThreadId, the pad-addressing projection padForThread, and the
// keystone generalized from "resolve into the root document" to "resolve into
// any pad" (resolveStepIntoPad). resolveStepIntoDocument is now the padLocator=
// null base case. All additive — the existing suite is the regression net.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  createThread,
  createStep,
  padForThread,
  resolveStepIntoPad,
  resolveStepIntoDocument,
  setPadText,
  addPadAnnotation,
  getPadMoves,
  getContextMoves,
  promoteSpanToMove,
  setStepOutput,
  setStepTitleById,
  drillIntoSpan,
  resolveThreadIntoParent,
  surfaceThreadId,
  navigateToThread,
  surfaceThreadPath,
  discardThread,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

describe("additive model fields", () => {
  it("createThread carries an empty sub-pad and a null parentAnchor", () => {
    const env = makeTestEnv();
    const thread = createThread({ title: "a move", now: env.now }, env);
    expect(thread.doc).toMatchObject({ text: "", annotations: [], phase: "stream", frozenText: null });
    expect(thread.parentAnchor).toBeNull();
  });

  it("createPad starts on the root surface (surfaceThreadId is null)", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "doc", now: env.now }, env);
    expect(surfaceThreadId(pad)).toBeNull();
    expect(pad.surfaceThreadId).toBeNull();
  });
});

describe("padForThread", () => {
  it("returns the root document for a null locator", () => {
    const env = makeTestEnv();
    const pad = {
      ...createPad({ title: "x", now: env.now }, env),
      doc: { text: "root", annotations: [] },
    };
    expect(padForThread(pad, null)).toEqual({ text: "root", annotations: [] });
  });

  it("returns a frame's own sub-pad by id, and null for an unknown frame", () => {
    const env = makeTestEnv();
    const thread = {
      ...createThread({ title: "m", now: env.now }, env),
      id: "frame:x",
      doc: { text: "sub", annotations: [] },
    };
    const pad = { ...createPad({ title: "x", now: env.now }, env), threads: [thread] };
    expect(padForThread(pad, "frame:x").text).toBe("sub");
    expect(padForThread(pad, "nope")).toBeNull();
  });
});

describe("resolveStepIntoPad — the keystone, one level down", () => {
  function padWithSubPad(env) {
    const step = { ...createStep({ id: "step:1", title: "resolve it" }, env), output: "RESULT" };
    const anchor = {
      id: "ann:1", stepId: "step:1",
      selectionStart: 0, selectionEnd: 4, selectedText: "mess",
      source: "mess", stepTitle: "resolve it", move: "", writeBack: "replace",
      createdAt: env.now, resolved: false, placement: "anchored", resolvedAt: null,
    };
    const thread = {
      id: "frame:1", steps: [step], subThreads: [],
      doc: { text: "mess here", annotations: [anchor] },
      parentAnchor: null, createdAt: env.now,
    };
    return { ...createPad({ title: "x", now: env.now }, env), threads: [thread] };
  }

  it("splices a step's output into THAT frame's sub-pad, leaving the root doc untouched", () => {
    const env = makeTestEnv();
    const next = resolveStepIntoPad(padWithSubPad(env), { stepId: "step:1", padLocator: "frame:1", now: env.now });
    expect(next.threads[0].doc.text).toBe("RESULT here");
    expect(next.threads[0].doc.annotations[0].resolved).toBe(true);
    expect(next.threads[0].doc.annotations[0].selectedText).toBe("RESULT");
    expect(next.doc.text).toBe(""); // root doc text unchanged
    expect(next.doc.annotations).toHaveLength(0); // root doc annotations unchanged
  });

  it("is idempotent — re-resolving an already-resolved step is a same-ref no-op", () => {
    const env = makeTestEnv();
    const once = resolveStepIntoPad(padWithSubPad(env), { stepId: "step:1", padLocator: "frame:1", now: env.now });
    const twice = resolveStepIntoPad(once, { stepId: "step:1", padLocator: "frame:1", now: env.now });
    expect(twice).toBe(once);
  });

  it("resolveStepIntoDocument equals resolveStepIntoPad with a null locator (the base case)", () => {
    const env = makeTestEnv();
    const step = { ...createStep({ id: "step:9", title: "t" }, env), output: "DONE" };
    const anchor = {
      id: "ann:9", stepId: "step:9",
      selectionStart: 0, selectionEnd: 4, selectedText: "mess",
      source: "mess", stepTitle: "t", move: "", writeBack: "replace",
      createdAt: env.now, resolved: false, placement: "anchored", resolvedAt: null,
    };
    const thread = {
      id: "frame:9", steps: [step], subThreads: [],
      doc: { text: "", annotations: [] }, parentAnchor: null, createdAt: env.now,
    };
    const pad = {
      ...createPad({ title: "x", now: env.now }, env),
      threads: [thread],
      doc: { text: "mess here", annotations: [anchor] },
    };
    const viaDoc = resolveStepIntoDocument(pad, { stepId: "step:9", now: env.now });
    const viaPad = resolveStepIntoPad(pad, { stepId: "step:9", padLocator: null, now: env.now });
    expect(viaDoc.doc.text).toBe("DONE here");
    expect(viaDoc).toEqual(viaPad);
  });
});

describe("persistence — additive round-trip (no schema bump)", () => {
  it("default-fills the new fields for a pre-feature record", () => {
    const env = makeTestEnv();
    const restored = normalizePad(
      { id: "ctx:legacy", threads: [{ id: "f1", steps: [{ id: "s1", title: "x" }], subThreads: [] }] },
      { now: env.now },
    );
    expect(surfaceThreadId(restored)).toBeNull();
    expect(restored.threads[0].doc).toEqual({ text: "", annotations: [], phase: "stream", frozenText: null, staged: [], draftHistory: [] });
    expect(restored.threads[0].parentAnchor).toBeNull();
  });

  it("round-trips frame.doc, parentAnchor, and surfaceThreadId", () => {
    const env = makeTestEnv();
    const thread = {
      id: "frame:1",
      steps: [{ id: "s1", title: "t" }],
      subThreads: [],
      doc: {
        text: "sub thoughts",
        annotations: [
          { id: "a1", stepId: "s1", selectionStart: 0, selectionEnd: 3, selectedText: "sub", source: "sub", createdAt: env.now },
        ],
      },
      parentAnchor: { annotationId: "rootAnn:1", parentFrameId: null },
      createdAt: env.now,
    };
    const pad = {
      ...createPad({ title: "doc", now: env.now }, env),
      threads: [thread],
      surfaceThreadId: "frame:1",
    };
    const restored = normalizePad(buildPadSnapshot(pad, { now: env.now }), { now: env.now });
    expect(surfaceThreadId(restored)).toBe("frame:1");
    expect(restored.surfaceThreadId).toBe("frame:1");
    expect(restored.threads[0].doc.text).toBe("sub thoughts");
    expect(restored.threads[0].doc.annotations[0].id).toBe("a1");
    expect(restored.threads[0].parentAnchor).toEqual({ annotationId: "rootAnn:1", parentFrameId: null });
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — behavior: pad-targeted reducers, drillIntoSpan, resolveThreadIntoParent,
// view navigation, and abandon hygiene.
// ---------------------------------------------------------------------------

function padWithSubThread(env, { rootText = "root", subText = "sub", subAnnotations = [] } = {}) {
  const thread = {
    id: "frame:1", steps: [], subThreads: [],
    doc: { text: subText, annotations: subAnnotations },
    parentAnchor: null, createdAt: env.now,
  };
  return {
    ...createPad({ title: "d", now: env.now }, env),
    doc: { text: rootText, annotations: [] },
    threads: [thread],
  };
}

describe("setPadText / addPadAnnotation / getPadMoves (pad-targeted)", () => {
  it("setPadText writes the root doc or a frame's sub-pad, leaving the other untouched", () => {
    const env = makeTestEnv();
    const pad = padWithSubThread(env);
    expect(setPadText(pad, { padLocator: null, text: "ROOT2" }, env).doc.text).toBe("ROOT2");
    const f = setPadText(pad, { padLocator: "frame:1", text: "SUB2" }, env);
    expect(f.threads[0].doc.text).toBe("SUB2");
    expect(f.doc.text).toBe("root"); // root untouched
  });

  it("setPadText is a same-ref no-op for unchanged text or an unknown frame", () => {
    const env = makeTestEnv();
    const pad = padWithSubThread(env);
    expect(setPadText(pad, { padLocator: "frame:1", text: "sub" }, env)).toBe(pad);
    expect(setPadText(pad, { padLocator: "nope", text: "x" }, env)).toBe(pad);
  });

  it("addPadAnnotation targets the located pad and keeps the stepId-required validation", () => {
    const env = makeTestEnv();
    const pad = padWithSubThread(env);
    const ann = { id: "a1", stepId: "s1", selectionStart: 0, selectionEnd: 3, selectedText: "sub" };
    const next = addPadAnnotation(pad, { padLocator: "frame:1", annotation: ann }, env);
    expect(next.threads[0].doc.annotations).toHaveLength(1);
    expect(next.doc.annotations).toHaveLength(0); // root untouched
    // stepId is load-bearing — a missing stepId is rejected (same ref)
    expect(addPadAnnotation(pad, { padLocator: "frame:1", annotation: { id: "a2", selectionStart: 0, selectionEnd: 3 } }, env)).toBe(pad);
    // unknown pad → same ref
    expect(addPadAnnotation(pad, { padLocator: "nope", annotation: ann }, env)).toBe(pad);
  });

  it("getPadMoves reads the located pad and equals getContextMoves at the root", () => {
    const env = makeTestEnv();
    const rootAnn = { id: "r1", stepId: "s1", selectionStart: 0, selectionEnd: 3, selectedText: "OUT", source: "src", resolved: true, resolvedAt: env.now, stepTitle: "t", move: "" };
    const subAnn = { id: "r2", stepId: "s2", selectionStart: 0, selectionEnd: 3, selectedText: "SUB", source: "s", resolved: true, resolvedAt: env.now, stepTitle: "u", move: "doubt" };
    const pad = { ...padWithSubThread(env, { subAnnotations: [subAnn] }), doc: { text: "OUT", annotations: [rootAnn] } };
    expect(getPadMoves(pad, null)).toHaveLength(1);
    expect(getPadMoves(pad, null)).toEqual(getContextMoves(pad));
    expect(getPadMoves(pad, "frame:1")[0].output).toBe("SUB");
    expect(getPadMoves(pad, "frame:1")[0].move).toBe("doubt");
    expect(getPadMoves(pad, "nope")).toEqual([]);
  });
});

describe("promoteSpanToMove — padLocator", () => {
  it("writes the anchor into the chosen pad but keeps the promoted frame a root sibling", () => {
    const env = makeTestEnv();
    const root = { ...createThread({ title: "root", now: env.now }, env), id: "frame:root", doc: { text: "alpha beta", annotations: [] } };
    const pad = { ...createPad({ title: "d", now: env.now }, env), threads: [root] };
    const { pad: resultPad, step, annotationId } = promoteSpanToMove(pad, {
      title: "m", selectionStart: 0, selectionEnd: 5, selectedText: "alpha", padLocator: "frame:root",
    }, env);
    expect(step).not.toBeNull();
    expect(resultPad.threads[0].doc.annotations.find((a) => a.id === annotationId)).toBeTruthy(); // anchor in the frame's pad
    expect(resultPad.doc.annotations).toHaveLength(0); // not the root doc
    expect(resultPad.threads).toHaveLength(2); // promoted frame is a NEW root sibling (depth 1)
    expect(resultPad.threads[1].steps[0].id).toBe(step.id);
  });

  it("is a no-op for an unknown padLocator", () => {
    const env = makeTestEnv();
    const pad = padWithSubThread(env);
    const r = promoteSpanToMove(pad, { title: "m", selectionStart: 0, selectionEnd: 3, selectedText: "sub", padLocator: "nope" }, env);
    expect(r.step).toBeNull();
    expect(r.pad).toBe(pad);
  });
});

describe("drillIntoSpan", () => {
  it("from the root: pushes a depth-1 frame with an empty sub-pad + anchor carrying the child step id", () => {
    const env = makeTestEnv();
    const base = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "the mess here", annotations: [] } };
    const { pad, frame, annotationId } = drillIntoSpan(base, {
      parentThreadId: null, title: "work the mess", selectionStart: 4, selectionEnd: 8, selectedText: "mess",
    }, env);
    expect(pad.threads).toHaveLength(1);
    expect(pad.threads[0]).toBe(frame);
    expect(frame.doc.text).toBe("");
    expect(frame.steps).toHaveLength(1);
    expect(frame.steps[0].title).toBe("work the mess");
    expect(frame.parentAnchor).toEqual({ annotationId, parentFrameId: null });
    const anchor = pad.doc.annotations.find((a) => a.id === annotationId);
    expect(anchor.stepId).toBe(frame.steps[0].id); // the linchpin
    expect(anchor.resolved).toBe(false);
    expect(surfaceThreadId(pad)).toBeNull(); // reducer never moves the pointer
  });

  it("from a frame: nests on subThreads and anchors in THAT frame's pad", () => {
    const env = makeTestEnv();
    const root = { ...createThread({ title: "root", now: env.now }, env), id: "frame:root", doc: { text: "child mess zone", annotations: [] } };
    const pad = { ...createPad({ title: "doc", now: env.now }, env), threads: [root] };
    const { pad: resultPad, frame, annotationId } = drillIntoSpan(pad, {
      parentThreadId: "frame:root", title: "drill", selectionStart: 6, selectionEnd: 10, selectedText: "mess",
    }, env);
    expect(resultPad.threads[0].subThreads).toHaveLength(1);
    expect(resultPad.threads[0].subThreads[0]).toBe(frame);
    expect(resultPad.threads[0].doc.annotations.find((a) => a.id === annotationId)).toBeTruthy();
    expect(resultPad.doc.annotations).toHaveLength(0); // not the root doc
    expect(frame.parentAnchor.parentFrameId).toBe("frame:root");
  });

  it("rejects a blank title, a bad range, or an unknown parent (same-ref no-op)", () => {
    const env = makeTestEnv();
    const base = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "the mess here", annotations: [] } };
    expect(drillIntoSpan(base, { parentThreadId: null, title: "  ", selectionStart: 4, selectionEnd: 8, selectedText: "mess" }, env).frame).toBeNull();
    expect(drillIntoSpan(base, { parentThreadId: null, title: "t", selectionStart: 4, selectionEnd: 4, selectedText: "" }, env).frame).toBeNull();
    const bad = drillIntoSpan(base, { parentThreadId: "nope", title: "t", selectionStart: 0, selectionEnd: 4, selectedText: "the " }, env);
    expect(bad.frame).toBeNull();
    expect(bad.pad).toBe(base);
  });

  it("tolerates an empty selectedText (seeds an empty sub-pad)", () => {
    const env = makeTestEnv();
    const base = { ...createPad({ title: "d", now: env.now }, env), doc: { text: "abcdef", annotations: [] } };
    const { frame } = drillIntoSpan(base, { parentThreadId: null, title: "g", selectionStart: 0, selectionEnd: 3, selectedText: "" }, env);
    expect(frame).not.toBeNull();
    expect(frame.doc.text).toBe("");
  });
});

describe("resolveThreadIntoParent — the roll-up", () => {
  function focusedFromRoot(env, { rootText = "the mess here", title = "g" } = {}) {
    const base = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: rootText, annotations: [] } };
    return drillIntoSpan(base, { parentThreadId: null, title, selectionStart: 4, selectionEnd: 8, selectedText: "mess" }, env);
  }

  it("single-loop into the ROOT doc: result replaces the span, anchor resolves, sub-pad archived, delta returned", () => {
    const env = makeTestEnv();
    const { pad: afterFocus, frame } = focusedFromRoot(env);
    const { pad, resolved, delta, parentFrameId, childStepId } =
      resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "RESOLVED" }, env);
    expect(resolved).toBe(true);
    expect(pad.doc.text).toBe("the RESOLVED here");
    const anchor = pad.doc.annotations[0];
    expect(anchor.resolved).toBe(true);
    expect(anchor.selectedText).toBe("RESOLVED");
    const kept = pad.threads.find((f) => f.id === frame.id);
    expect(kept).toBeTruthy();           // archive, not delete
    expect(kept.doc.text).toBe("");     // sub-pad preserved (empty — never seeded)
    expect(kept.steps[0].output).toBe("RESOLVED");
    expect(delta).toMatchObject({ padLocator: null, shiftFrom: 8, amount: 4 });
    expect(parentFrameId).toBeNull();
    expect(childStepId).toBe(frame.steps[0].id);
  });

  it("single-loop into a FRAME pad: parent sub-pad spliced, root doc untouched", () => {
    const env = makeTestEnv();
    const root = { ...createThread({ title: "root", now: env.now }, env), id: "frame:root", doc: { text: "alpha beta", annotations: [] } };
    const pad = { ...createPad({ title: "doc", now: env.now }, env), threads: [root] };
    const { pad: afterFocus, frame } = drillIntoSpan(pad, { parentThreadId: "frame:root", title: "g", selectionStart: 6, selectionEnd: 10, selectedText: "beta" }, env);
    const { pad: resultPad, parentFrameId } = resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "BETA!" }, env);
    expect(resultPad.threads[0].doc.text).toBe("alpha BETA!");
    expect(resultPad.doc.text).toBe("");
    expect(parentFrameId).toBe("frame:root");
  });

  it("double-loop rewrites the parent frame's goal; blank goal stays single-loop", () => {
    const env = makeTestEnv();
    const root = { ...createThread({ title: "old goal", now: env.now }, env), id: "frame:root", doc: { text: "alpha beta", annotations: [] } };
    const pad = { ...createPad({ title: "doc", now: env.now }, env), threads: [root] };
    const { pad: afterFocus, frame } = drillIntoSpan(pad, { parentThreadId: "frame:root", title: "g", selectionStart: 6, selectionEnd: 10, selectedText: "beta" }, env);
    const reframed = resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "BETA!", reframe: { goal: "new parent goal" } }, env);
    expect(reframed.pad.threads[0].steps[0].title).toBe("new parent goal");
    const blank = resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "BETA!", reframe: { goal: "   " } }, env);
    expect(blank.pad.threads[0].steps[0].title).toBe("old goal"); // unchanged
  });

  it("double-loop from the ROOT degrades to span-replacement (no goal object, no error)", () => {
    const env = makeTestEnv();
    const { pad: afterFocus, frame } = focusedFromRoot(env);
    const { pad, resolved } = resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "X", reframe: { goal: "ignored at root" } }, env);
    expect(resolved).toBe(true);
    expect(pad.doc.text).toBe("the X here");
  });

  it("is idempotent — a second roll-up is a same-ref no-op with delta null", () => {
    const env = makeTestEnv();
    const { pad: afterFocus, frame } = focusedFromRoot(env);
    const once = resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "R" }, env);
    const twice = resolveThreadIntoParent(once.pad, { threadId: frame.id, result: "DIFFERENT" }, env);
    expect(twice.pad).toBe(once.pad);
    expect(twice.resolved).toBe(true);
    expect(twice.delta).toBeNull();
  });

  it("no-ops on empty result, a null parentAnchor, or an unknown frame", () => {
    const env = makeTestEnv();
    const { pad: afterFocus, frame } = focusedFromRoot(env);
    expect(resolveThreadIntoParent(afterFocus, { threadId: frame.id, result: "" }, env).pad).toBe(afterFocus);
    // a promoted-move frame has parentAnchor null → nothing to fold into
    const promoted = promoteSpanToMove({ ...createPad({ title: "d", now: env.now }, env), doc: { text: "abcdef", annotations: [] } }, { title: "m", selectionStart: 0, selectionEnd: 3, selectedText: "abc" }, env).pad;
    expect(resolveThreadIntoParent(promoted, { threadId: promoted.threads[0].id, result: "R" }, env).pad).toBe(promoted);
    expect(resolveThreadIntoParent(afterFocus, { threadId: "nope", result: "R" }, env).pad).toBe(afterFocus);
  });

  it("tolerant re-find: still splices when the parent text shifted out from under the anchor", () => {
    const env = makeTestEnv();
    const { pad: afterFocus, frame } = focusedFromRoot(env);
    const moved = { ...afterFocus, doc: { ...afterFocus.doc, text: "PREFIX " + afterFocus.doc.text } };
    const { pad } = resolveThreadIntoParent(moved, { threadId: frame.id, result: "FIXED" }, env);
    expect(pad.doc.text).toBe("PREFIX the FIXED here");
  });
});

describe("setStepTitleById", () => {
  it("renames a step anywhere in the tree (e.g. a drilled frame's goal); same-ref when unchanged/unknown", () => {
    const env = makeTestEnv();
    const base = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "the mess here", annotations: [] } };
    const { pad, frame } = drillIntoSpan(base, { parentThreadId: null, title: "old goal", selectionStart: 4, selectionEnd: 8, selectedText: "mess" }, env);
    const renamed = setStepTitleById(pad, { stepId: frame.steps[0].id, title: "new goal" }, env);
    expect(renamed.threads[0].steps[0].title).toBe("new goal");
    expect(setStepTitleById(pad, { stepId: frame.steps[0].id, title: "old goal" }, env)).toBe(pad); // unchanged
    expect(setStepTitleById(pad, { stepId: "nope", title: "x" }, env)).toBe(pad); // unknown
  });
});

describe("navigateToThread / surfaceThreadPath", () => {
  function nested(env) {
    const child = { id: "frame:child", steps: [{ id: "cs", title: "c" }], subThreads: [], doc: { text: "", annotations: [] }, parentAnchor: { annotationId: "a", parentFrameId: "frame:root" }, createdAt: env.now };
    const root = { id: "frame:root", steps: [{ id: "rs", title: "r" }], subThreads: [child], doc: { text: "", annotations: [] }, parentAnchor: null, createdAt: env.now };
    return { ...createPad({ title: "d", now: env.now }, env), threads: [root] };
  }

  it("navigateToThread accepts any-depth ids, clears on null, and is same-ref for unknown/unchanged", () => {
    const env = makeTestEnv();
    const pad = nested(env);
    expect(surfaceThreadId(navigateToThread(pad, "frame:child", env))).toBe("frame:child");
    expect(surfaceThreadId(navigateToThread(pad, "frame:root", env))).toBe("frame:root");
    const viewed = navigateToThread(pad, "frame:child", env);
    expect(surfaceThreadId(navigateToThread(viewed, null, env))).toBeNull();
    expect(navigateToThread(viewed, "frame:child", env)).toBe(viewed); // unchanged
    expect(navigateToThread(pad, "nope", env)).toBe(pad);              // unknown
    expect(navigateToThread(pad, null, env)).toBe(pad);                // already null
  });

  it("surfaceThreadPath returns the root→leaf chain; [] when null or stale", () => {
    const env = makeTestEnv();
    const pad = nested(env);
    expect(surfaceThreadPath(pad)).toEqual([]);
    expect(surfaceThreadPath(navigateToThread(pad, "frame:root", env)).map((f) => f.id)).toEqual(["frame:root"]);
    expect(surfaceThreadPath(navigateToThread(pad, "frame:child", env)).map((f) => f.id)).toEqual(["frame:root", "frame:child"]);
    expect(surfaceThreadPath({ ...pad, surfaceThreadId: "ghost" })).toEqual([]);
  });
});

describe("discardThread — abandon hygiene", () => {
  function untouchedDrill(env) {
    const base = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "alpha beta gamma", annotations: [] } };
    return drillIntoSpan(base, { parentThreadId: null, title: "g", selectionStart: 6, selectionEnd: 10, selectedText: "beta" }, env);
  }

  it("discards an untouched drill and removes its parent anchor, WITHOUT completing the doc", () => {
    const env = makeTestEnv();
    const { pad, frame } = untouchedDrill(env);
    expect(pad.state).toBe("active");
    const next = discardThread(pad, frame.id, env);
    expect(next.threads.find((f) => f.id === frame.id)).toBeUndefined();
    expect(next.doc.annotations).toHaveLength(0);
    // Abandoning the LAST root drill must not flip the pad to "completed".
    expect(next.state).toBe("active");
  });

  it("keeps a drill once it has been worked (same-ref) — each disqualifier independently", () => {
    const env = makeTestEnv();
    // edited body
    {
      const { pad, frame } = untouchedDrill(env);
      const edited = setPadText(pad, { padLocator: frame.id, text: "beta — new thoughts" }, env);
      expect(discardThread(edited, frame.id, env)).toBe(edited);
    }
    // step output
    {
      const { pad, frame } = untouchedDrill(env);
      const out = setStepOutput(pad, { stepId: frame.steps[0].id, output: "done" }, env);
      expect(discardThread(out, frame.id, env)).toBe(out);
    }
    // a child drill
    {
      const { pad, frame } = untouchedDrill(env);
      const withChild = drillIntoSpan(pad, { parentThreadId: frame.id, title: "deeper", selectionStart: 0, selectionEnd: 4, selectedText: "beta" }, env).pad;
      expect(discardThread(withChild, frame.id, env)).toBe(withChild);
    }
    // its own annotation
    {
      const { pad, frame } = untouchedDrill(env);
      const withAnn = addPadAnnotation(pad, { padLocator: frame.id, annotation: { id: "x", stepId: "sx", selectionStart: 0, selectionEnd: 4, selectedText: "beta" } }, env);
      expect(discardThread(withAnn, frame.id, env)).toBe(withAnn);
    }
  });

  it("is a same-ref no-op for an unknown id or a non-drill (parentAnchor null) frame", () => {
    const env = makeTestEnv();
    const { pad, frame } = untouchedDrill(env);
    expect(discardThread(pad, "nope", env)).toBe(pad);
    const promoted = promoteSpanToMove({ ...createPad({ title: "d", now: env.now }, env), doc: { text: "abcdef", annotations: [] } }, { title: "m", selectionStart: 0, selectionEnd: 3, selectedText: "abc" }, env).pad;
    expect(discardThread(promoted, promoted.threads[0].id, env)).toBe(promoted);
    void frame;
  });
});
