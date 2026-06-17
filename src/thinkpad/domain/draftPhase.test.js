// ---------------------------------------------------------------------------
// Draft phase state machine tests — stream-reflect-lifecycle.
//
// Covers the four new reducers (stampDraft, stageStepOutput, revealReflectPass,
// restreamDraft), the freeze guard on setPadText, and persistence round-trips.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import * as padDomain from "./padDomain";
import {
  createPad,
  captureIdea,
  promoteSpanToMove,
  setStepOutput,
  stampDraft,
  stageStepOutput,
  revealReflectPass,
  restreamDraft,
  advanceToNextDraft,
  setPadText,
} from "./padDomain";
import { normalizePadRecord, buildPadSnapshot } from "./padPersistenceMapper";
import { makeTestEnv, FIXED_NOW } from "./__testkit__";

// Convenience: create a pad that already has some text in the root doc.
function padWithText(text, env) {
  let pad = createPad({ title: "Test", now: env.now }, env);
  pad = setPadText(pad, { padLocator: null, text }, { now: env.now });
  return pad;
}

// ---------------------------------------------------------------------------
// stampDraft
// ---------------------------------------------------------------------------

describe("stampDraft", () => {
  it("transitions phase to cultivate, snapshots frozenText, seeds versions[0]", () => {
    const env = makeTestEnv();
    const pad = padWithText("Hello world", env);
    const stamped = stampDraft(pad, {}, { now: env.now });
    const doc = stamped.doc;
    expect(doc.phase).toBe("cultivate");
    expect(doc.frozenText).toBe("Hello world");
    expect(doc.versions).toHaveLength(1);
    expect(doc.versions[0]).toMatchObject({ n: 0, text: "Hello world" });
    expect(doc.staged).toEqual([]);
  });

  it("is a no-op (same ref) when already in cultivate phase", () => {
    const env = makeTestEnv();
    const pad = padWithText("Hello", env);
    const once = stampDraft(pad, {}, { now: env.now });
    const twice = stampDraft(once, {}, { now: env.now });
    expect(twice).toBe(once); // same reference — pure no-op
  });

  it("new pad starts in stream phase by default", () => {
    const env = makeTestEnv();
    const pad = createPad({ title: "Fresh", now: env.now }, env);
    expect(pad.doc.phase).toBe("stream");
  });
});

// ---------------------------------------------------------------------------
// setPadText freeze guard
// ---------------------------------------------------------------------------

describe("setPadText freeze guard", () => {
  it("blocks text edits when phase is cultivate (same ref returned)", () => {
    const env = makeTestEnv();
    const pad = padWithText("Frozen content", env);
    const frozen = stampDraft(pad, {}, { now: env.now });
    const attempted = setPadText(frozen, { padLocator: null, text: "Override" }, { now: env.now });
    expect(attempted).toBe(frozen); // same ref — edit rejected
    expect(attempted.doc.text).toBe("Frozen content");
  });

  it("allows text edits when phase is stream", () => {
    const env = makeTestEnv();
    const pad = padWithText("Editable", env);
    const edited = setPadText(pad, { padLocator: null, text: "Changed" }, { now: env.now });
    expect(edited.doc.text).toBe("Changed");
  });
});

// ---------------------------------------------------------------------------
// stageStepOutput
// ---------------------------------------------------------------------------

describe("stageStepOutput", () => {
  it("appends a staged entry without changing the doc text", () => {
    const env = makeTestEnv();
    let pad = padWithText("Original text", env);
    pad = stampDraft(pad, {}, { now: env.now });

    // Capture an idea so we have an annotationId to reference.
    const { pad: withIdea, ideaId } = captureIdea(pad, {
      selectionStart: 0, selectionEnd: 8, selectedText: "Original",
    }, env);

    // Park a dummy step output — in practice performMoveOnIdea provides the stepId.
    const staged = stageStepOutput(withIdea, {
      stepId: "step:fake",
      annotationId: ideaId,
      text: "Clarified text",
    }, env);

    expect(staged.doc.staged).toHaveLength(1);
    expect(staged.doc.staged[0]).toMatchObject({
      stepId: "step:fake",
      annotationId: ideaId,
      text: "Clarified text",
    });
    // Doc text must not change — staging only.
    expect(staged.doc.text).toBe("Original text");
  });

  it("is a no-op when the doc is in stream phase", () => {
    const env = makeTestEnv();
    const pad = padWithText("Not frozen", env);
    const result = stageStepOutput(pad, { stepId: "step:x", text: "output" }, env);
    expect(result).toBe(pad); // same ref — phase guard fired
  });

  it("accumulates multiple staged entries", () => {
    const env = makeTestEnv();
    let pad = padWithText("aaa bbb", env);
    pad = stampDraft(pad, {}, { now: env.now });
    pad = stageStepOutput(pad, { stepId: "s1", text: "out1" }, env);
    pad = stageStepOutput(pad, { stepId: "s2", text: "out2" }, env);
    expect(pad.doc.staged).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// revealReflectPass
// ---------------------------------------------------------------------------

describe("revealReflectPass", () => {
  it("is a no-op when nothing is staged", () => {
    const env = makeTestEnv();
    const pad = stampDraft(padWithText("text", env), {}, { now: env.now });
    const result = revealReflectPass(pad, {}, { now: env.now });
    expect(result).toBe(pad); // same ref
  });

  it("is a no-op when phase is stream", () => {
    const env = makeTestEnv();
    const pad = padWithText("text", env);
    const result = revealReflectPass(pad, {}, { now: env.now });
    expect(result).toBe(pad);
  });

  it("applies staged output, clears staging, mints vN+1", () => {
    const env = makeTestEnv();
    const text = "Replace this span with something better.";
    let pad = padWithText(text, env);

    // Promote a span to a move so we get a real step + annotation.
    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Clarify the opener",
      selectionStart: 0,
      selectionEnd: 12, // "Replace this"
      selectedText: "Replace this",
      move: "clarify",
      writeBack: "replace",
    }, env);

    // Stamp the draft.
    let stamped = stampDraft(promoted, {}, { now: env.now });
    expect(stamped.doc.versions).toHaveLength(1); // v0

    // Set the step output and stage it (mimics the cultivate work pass).
    stamped = setStepOutput(stamped, { stepId: step.id, output: "Improve" }, { now: env.now });
    stamped = stageStepOutput(stamped, {
      stepId: step.id,
      annotationId,
      text: "Improve",
    }, env);
    expect(stamped.doc.staged).toHaveLength(1);

    // Reveal pass.
    const revealed = revealReflectPass(stamped, {}, { now: env.now });

    // Staging area is cleared.
    expect(revealed.doc.staged).toHaveLength(0);
    // A new version was minted.
    expect(revealed.doc.versions).toHaveLength(2);
    expect(revealed.doc.versions[1].n).toBe(1);
    // The span was replaced in the text.
    expect(revealed.doc.text).toContain("Improve");
    expect(revealed.doc.text).not.toContain("Replace this");
    // Phase stays cultivate (study beat is a transient UI state, not stored).
    expect(revealed.doc.phase).toBe("cultivate");
  });

  it("applies two staged outputs in reverse document order without offset corruption", () => {
    const env = makeTestEnv();
    // Two non-overlapping spans at known positions.
    const text = "AAAA BBBB";
    //            0123 4567
    let pad = padWithText(text, env);

    const { pad: p1, step: stepA, annotationId: annA } = promoteSpanToMove(pad, {
      title: "Replace A",
      selectionStart: 0, selectionEnd: 4, selectedText: "AAAA",
      move: "clarify", writeBack: "replace",
    }, env);

    const { pad: p2, step: stepB, annotationId: annB } = promoteSpanToMove(p1, {
      title: "Replace B",
      selectionStart: 5, selectionEnd: 9, selectedText: "BBBB",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(p2, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: stepA.id, output: "AA" }, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: stepB.id, output: "BB" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: stepA.id, annotationId: annA, text: "AA" }, env);
    stamped = stageStepOutput(stamped, { stepId: stepB.id, annotationId: annB, text: "BB" }, env);

    const revealed = revealReflectPass(stamped, {}, { now: env.now });

    // Both replacements must land correctly regardless of which was staged first.
    expect(revealed.doc.text).toContain("AA");
    expect(revealed.doc.text).toContain("BB");
    expect(revealed.doc.text).not.toContain("AAAA");
    expect(revealed.doc.text).not.toContain("BBBB");
    expect(revealed.doc.staged).toHaveLength(0);
    expect(revealed.doc.versions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// restreamDraft
// ---------------------------------------------------------------------------

describe("restreamDraft", () => {
  it("flips phase back to stream when cultivating", () => {
    const env = makeTestEnv();
    let pad = padWithText("Ready to edit again", env);
    pad = stampDraft(pad, {}, { now: env.now });
    expect(pad.doc.phase).toBe("cultivate");

    const next = restreamDraft(pad, {}, { now: env.now });
    expect(next.doc.phase).toBe("stream");
    // Text is unchanged — the user is unlocking the doc for direct editing.
    expect(next.doc.text).toBe("Ready to edit again");
  });

  it("is a no-op (same ref) when already in stream phase", () => {
    const env = makeTestEnv();
    const pad = padWithText("Not frozen", env);
    const result = restreamDraft(pad, {}, { now: env.now });
    expect(result).toBe(pad);
  });

  it("discards staged outputs when returning to stream", () => {
    const env = makeTestEnv();
    let pad = padWithText("aaa", env);
    pad = stampDraft(pad, {}, { now: env.now });
    pad = stageStepOutput(pad, { stepId: "s1", annotationId: "a1", text: "out" }, env);
    expect(pad.doc.staged).toHaveLength(1);

    const next = restreamDraft(pad, {}, { now: env.now });
    expect(next.doc.staged).toHaveLength(0);
  });

  it("preserves frozenText and versions as a record of the cultivation pass", () => {
    const env = makeTestEnv();
    let pad = padWithText("History matters", env);
    pad = stampDraft(pad, {}, { now: env.now });
    const next = restreamDraft(pad, {}, { now: env.now });
    // frozenText and versions survive — they are historical artifacts, not mutable state.
    expect(next.doc.frozenText).toBe("History matters");
    expect(next.doc.versions).toHaveLength(1);
  });

  it("does not create any new threads", () => {
    const env = makeTestEnv();
    let pad = padWithText("Simple", env);
    const initialCount = pad.threads.length;
    pad = stampDraft(pad, {}, { now: env.now });
    const next = restreamDraft(pad, {}, { now: env.now });
    expect(next.threads).toHaveLength(initialCount);
  });
});

// ---------------------------------------------------------------------------
// Persistence round-trip — new fields survive save/load
// ---------------------------------------------------------------------------

describe("draft phase persistence round-trip", () => {
  it("preserves phase, frozenText, staged, and versions across normalize→snapshot→normalize", () => {
    const env = makeTestEnv();
    let pad = padWithText("Persist this", env);
    pad = stampDraft(pad, {}, { now: env.now });
    pad = stageStepOutput(pad, { stepId: "s1", annotationId: "a1", text: "staged output" }, env);

    const snapshot = buildPadSnapshot(pad, { now: env.now });
    const restored = normalizePadRecord(snapshot, { now: env.now });

    expect(restored.doc.phase).toBe("cultivate");
    expect(restored.doc.frozenText).toBe("Persist this");
    expect(restored.doc.staged).toHaveLength(1);
    expect(restored.doc.staged[0]).toMatchObject({ stepId: "s1", text: "staged output" });
    expect(restored.doc.versions).toHaveLength(1);
    expect(restored.doc.versions[0]).toMatchObject({ n: 0, text: "Persist this" });
  });

  it("default-fills phase fields to stream defaults for pre-feature records", () => {
    const env = makeTestEnv();
    // A record with no phase fields (simulates an old stored record).
    const legacy = { id: "pad:old", schemaVersion: 9, doc: { text: "old text", annotations: [] } };
    const restored = normalizePadRecord(legacy, { now: env.now });
    expect(restored.doc.phase).toBe("stream");
    expect(restored.doc.frozenText).toBeNull();
    expect(restored.doc.staged).toEqual([]);
    expect(restored.doc.versions).toEqual([]);
  });

  it("preserves draftHistory across normalize→snapshot→normalize", () => {
    const env = makeTestEnv();
    const text = "First pass";
    let pad = padWithText(text, env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Clarify opener",
      selectionStart: 0, selectionEnd: 5, selectedText: "First",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "Opening" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "Opening" }, env);
    const advanced = advanceToNextDraft(stamped, {}, { now: env.now, makeId: env.makeId });

    const snapshot = buildPadSnapshot(advanced, { now: env.now });
    const restored = normalizePadRecord(snapshot, { now: env.now });

    expect(restored.doc.draftHistory).toHaveLength(2);
    expect(restored.doc.draftHistory[0]).toMatchObject({ n: 0, text: "First pass", contributions: [] });
    expect(restored.doc.draftHistory[1].contributions[0]).toMatchObject({ moveId: "clarify", source: "First" });
  });
});

// ---------------------------------------------------------------------------
// advanceToNextDraft
// ---------------------------------------------------------------------------

describe("advanceToNextDraft", () => {
  it("is a no-op (same ref) when phase is stream", () => {
    const env = makeTestEnv();
    const pad = padWithText("not frozen", env);
    const result = advanceToNextDraft(pad, {}, env);
    expect(result).toBe(pad);
  });

  it("is a no-op (same ref) when nothing is staged", () => {
    const env = makeTestEnv();
    let pad = padWithText("frozen but empty", env);
    pad = stampDraft(pad, {}, { now: env.now });
    const result = advanceToNextDraft(pad, {}, env);
    expect(result).toBe(pad);
  });

  it("seeds draftHistory[0] with original frozen text on first advance", () => {
    const env = makeTestEnv();
    const text = "Original draft content";
    let pad = padWithText(text, env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Improve opener",
      selectionStart: 0, selectionEnd: 8, selectedText: "Original",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "Revised" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "Revised" }, env);

    const advanced = advanceToNextDraft(stamped, {}, env);

    expect(advanced.doc.draftHistory).toHaveLength(2);
    expect(advanced.doc.draftHistory[0]).toMatchObject({ n: 0, text, contributions: [] });
  });

  it("appends draftHistory[1] with the revised text and contributions", () => {
    const env = makeTestEnv();
    let pad = padWithText("Fix this sentence.", env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Clarify",
      selectionStart: 0, selectionEnd: 3, selectedText: "Fix",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "Refine" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "Refine" }, env);

    const advanced = advanceToNextDraft(stamped, {}, env);

    expect(advanced.doc.draftHistory).toHaveLength(2);
    const entry1 = advanced.doc.draftHistory[1];
    expect(entry1.n).toBe(1);
    expect(entry1.text).toContain("Refine");
    expect(entry1.contributions).toHaveLength(1);
  });

  it("contributions capture moveId, intent, tag, source, and output", () => {
    const env = makeTestEnv();
    let pad = padWithText("Unclear claim here.", env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Doubt this",
      selectionStart: 0, selectionEnd: 7, selectedText: "Unclear",
      move: "doubt", writeBack: "annotate",
    }, env);

    // Tag the annotation to simulate user-declared stance.
    const ann = promoted.doc.annotations.find((a) => a.id === annotationId);
    // Patch intent and tag directly for the test (normally set by detector/picker).
    const patchedPad = {
      ...promoted,
      doc: {
        ...promoted.doc,
        annotations: promoted.doc.annotations.map((a) =>
          a.id === annotationId ? { ...a, intent: "DOUBT", tag: "question" } : a,
        ),
      },
    };

    let stamped = stampDraft(patchedPad, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "This is actually sound." }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "This is actually sound." }, env);

    const advanced = advanceToNextDraft(stamped, {}, env);
    const contrib = advanced.doc.draftHistory[1].contributions[0];

    expect(contrib.moveId).toBe("doubt");
    expect(contrib.intent).toBe("DOUBT");
    expect(contrib.tag).toBe("question");
    expect(contrib.source).toBe("Unclear");
    expect(contrib.output).toBe("This is actually sound.");
    expect(contrib.annotationId).toBe(annotationId);
    expect(contrib.stepId).toBe(step.id);
  });

  it("stays in reflect (cultivate) mode after advancing", () => {
    const env = makeTestEnv();
    let pad = padWithText("Draft one.", env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Improve",
      selectionStart: 0, selectionEnd: 5, selectedText: "Draft",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "Iteration" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "Iteration" }, env);

    const advanced = advanceToNextDraft(stamped, {}, env);
    expect(advanced.doc.phase).toBe("cultivate");
  });

  it("accumulates draftHistory across two advancement cycles", () => {
    const env = makeTestEnv();
    let pad = padWithText("Version zero text.", env);

    // First cycle
    const { pad: p1, step: s1, annotationId: a1 } = promoteSpanToMove(pad, {
      title: "Step 1",
      selectionStart: 0, selectionEnd: 7, selectedText: "Version",
      move: "clarify", writeBack: "replace",
    }, env);
    let cycle1 = stampDraft(p1, {}, { now: env.now });
    cycle1 = setStepOutput(cycle1, { stepId: s1.id, output: "Draft" }, { now: env.now });
    cycle1 = stageStepOutput(cycle1, { stepId: s1.id, annotationId: a1, text: "Draft" }, env);
    cycle1 = advanceToNextDraft(cycle1, {}, env);
    expect(cycle1.doc.draftHistory).toHaveLength(2); // [v0, v1]

    // Second cycle: stamp the result, make another move, advance again
    const { pad: p2, step: s2, annotationId: a2 } = promoteSpanToMove(cycle1, {
      title: "Step 2",
      selectionStart: 0, selectionEnd: 5, selectedText: "Draft",
      move: "support", writeBack: "replace",
    }, env);
    let cycle2 = stampDraft(p2, {}, { now: env.now });
    cycle2 = setStepOutput(cycle2, { stepId: s2.id, output: "Refined" }, { now: env.now });
    cycle2 = stageStepOutput(cycle2, { stepId: s2.id, annotationId: a2, text: "Refined" }, env);
    cycle2 = advanceToNextDraft(cycle2, {}, env);

    // draftHistory accumulates across cycles: [v0, v1, v2]
    expect(cycle2.doc.draftHistory).toHaveLength(3);
    expect(cycle2.doc.draftHistory[2].n).toBe(2);
    expect(cycle2.doc.draftHistory[2].contributions[0].moveId).toBe("support");
  });
});

// ---------------------------------------------------------------------------
// Draft history navigation — consistency & the "edit from history" bug
//
// These tests capture the expected state transitions when navigating draft
// history and then entering edit (stream) mode.  Several of them FAIL with
// the current implementation; those failures point directly at the missing
// "branch from a historical snapshot" primitive.
// ---------------------------------------------------------------------------

// Build a pad through `count` full draft cycles and return { pad, texts }
// where texts[0] is the original, texts[k] is the text after advance k.
function buildDraftCycles(count, env) {
  const baseText = "sentence zero";
  let pad = padWithText(baseText, env);
  const texts = [baseText];

  for (let i = 0; i < count; i++) {
    // Promote the first 8 chars as a clarify-replace move each cycle.
    // Offset 0-8 is always present because we seed with enough text.
    const src = pad.doc.text.slice(0, 8);
    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: `Move ${i + 1}`,
      selectionStart: 0,
      selectionEnd: src.length,
      selectedText: src,
      move: "clarify",
      writeBack: "replace",
    }, env);
    const output = `draft${i + 1}`;
    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: output }, env);
    pad = advanceToNextDraft(stamped, {}, env);
    texts.push(pad.doc.text);
  }
  return { pad, texts };
}

describe("draftHistory — snapshot integrity", () => {
  it("each draftHistory entry stores the exact text that existed at that point", () => {
    const env = makeTestEnv();
    const { pad, texts } = buildDraftCycles(2, env);
    // draftHistory: [entry0 = original, entry1 = after 1st advance, entry2 = after 2nd]
    expect(pad.doc.draftHistory).toHaveLength(3);
    expect(pad.doc.draftHistory[0].text).toBe(texts[0]);
    expect(pad.doc.draftHistory[1].text).toBe(texts[1]);
    expect(pad.doc.draftHistory[2].text).toBe(texts[2]);
  });

  it("historical entries are immutable — a subsequent advance does not mutate earlier entries", () => {
    const env = makeTestEnv();
    const { pad: after2 } = buildDraftCycles(2, env);
    const snapshot1 = after2.doc.draftHistory[1].text;

    // Perform a third cycle.
    const src = after2.doc.text.slice(0, 8);
    const { pad: p3, step: s3, annotationId: a3 } = promoteSpanToMove(after2, {
      title: "Move 3",
      selectionStart: 0, selectionEnd: src.length, selectedText: src,
      move: "clarify", writeBack: "replace",
    }, env);
    let s = stampDraft(p3, {}, { now: env.now });
    s = setStepOutput(s, { stepId: s3.id, output: "draft3" }, { now: env.now });
    s = stageStepOutput(s, { stepId: s3.id, annotationId: a3, text: "draft3" }, env);
    const after3 = advanceToNextDraft(s, {}, env);

    // draftHistory[1] must not have changed.
    expect(after3.doc.draftHistory[1].text).toBe(snapshot1);
    // draftHistory now has 4 entries.
    expect(after3.doc.draftHistory).toHaveLength(4);
  });

  it("draft texts differ from each other across cycles", () => {
    const env = makeTestEnv();
    const { pad } = buildDraftCycles(3, env);
    const texts = pad.doc.draftHistory.map((e) => e.text);
    // Every entry should be unique.
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  it("draftHistory[0] is always the original pre-edit frozen text, not an edited version", () => {
    const env = makeTestEnv();
    const originalText = "the very first draft";
    let pad = padWithText(originalText, env);

    const { pad: promoted, step, annotationId } = promoteSpanToMove(pad, {
      title: "Edit first word",
      selectionStart: 0, selectionEnd: 3, selectedText: "the",
      move: "clarify", writeBack: "replace",
    }, env);

    let stamped = stampDraft(promoted, {}, { now: env.now });
    stamped = setStepOutput(stamped, { stepId: step.id, output: "a" }, { now: env.now });
    stamped = stageStepOutput(stamped, { stepId: step.id, annotationId, text: "a" }, env);
    const advanced = advanceToNextDraft(stamped, {}, env);

    expect(advanced.doc.draftHistory[0].text).toBe(originalText);
  });

  it("each entry carries an n field matching its position in the array", () => {
    const env = makeTestEnv();
    const { pad } = buildDraftCycles(2, env);
    pad.doc.draftHistory.forEach((entry, idx) => {
      expect(entry.n).toBe(idx);
    });
  });
});

describe("restreamDraft — gap: cannot branch from a historical entry", () => {
  it("phase is cultivate after advancing — restreamDraft transitions back to stream", () => {
    // advanceToNextDraft now leaves the doc in cultivate (reflect) mode, not stream.
    // restreamDraft is still effective and returns a new pad in stream phase.
    const env = makeTestEnv();
    const { pad } = buildDraftCycles(1, env);
    expect(pad.doc.phase).toBe("cultivate");
    const result = restreamDraft(pad, {}, { now: env.now });
    expect(result).not.toBe(pad);
    expect(result.doc.phase).toBe("stream");
  });

  it("restreamDraft in cultivate mode restores to the CURRENT frozen text, not a historical entry", () => {
    // If the user stamps AFTER advancing (cultivate mode), restream brings back
    // the frozen snapshot of the LATEST draft — it has no knowledge of which
    // historical entry the user was browsing.
    const env = makeTestEnv();
    const { pad: after1, texts } = buildDraftCycles(1, env);
    // after1 is already in cultivate — stampDraft is a no-op, frozenText = texts[1].
    const stamped = stampDraft(after1, {}, { now: env.now });
    expect(stamped.doc.frozenText).toBe(texts[1]); // frozenText = latest draft text

    // restream from cultivate mode — should go back to the FROZEN text, not history[0].
    const restreamed = restreamDraft(stamped, {}, { now: env.now });
    expect(restreamed.doc.phase).toBe("stream");
    expect(restreamed.doc.text).toBe(texts[1]);         // still the latest draft
    expect(restreamed.doc.text).not.toBe(texts[0]);     // NOT the original draft
  });

  // ── Expected behavior (fails until the bug is fixed) ──────────────────────

  it("EXPECTED (fails until fixed): restreamFromDraftHistory(pad, { n }) sets doc.text to draftHistory[n].text", () => {
    // This test describes the domain primitive that must exist for the
    // navigation → edit flow to work correctly. It will FAIL until
    // restreamFromDraftHistory is exported from padDomain.
    const env = makeTestEnv();
    const { pad, texts } = buildDraftCycles(2, env);

    // Access via the namespace import so an absent export gives a clear failure.
    const fn = padDomain.restreamFromDraftHistory;
    expect(fn, "restreamFromDraftHistory must be exported from padDomain").toBeDefined();

    // Branch from the first historical entry (index 0 = original frozen text).
    const branched = fn(pad, { padLocator: null, n: 0 }, { now: env.now });
    expect(branched.doc.phase).toBe("stream");
    expect(branched.doc.text).toBe(texts[0]);       // original text, not latest
    expect(branched.doc.staged).toEqual([]);         // clean staging area
    expect(branched.doc.staged).not.toBe(pad.doc.staged); // new array, not same ref
    // draftHistory must be preserved as a read-only record after branching.
    expect(branched.doc.draftHistory).toHaveLength(pad.doc.draftHistory.length);
  });
});
