// ---------------------------------------------------------------------------
// Reflect as a state (roadmap Revisions 14 and 15).
//
// A document is living. Entering Reflect freezes it and records a draft
// version (only if the text changed); leaving Reflect applies waiting results
// first, then returns to writing. Passages drilled earlier are re-found by
// their words on entering Reflect, since writing moves their offsets.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  padForThread,
  drillIntoSpan,
  stageStepOutput,
  enterReflect,
  leaveReflect,
  reanchorAnnotations,
  advanceToNextDraft,
} from "./padDomain";
import { makeTestEnv } from "./__testkit__";

const root = (pad) => padForThread(pad, null);

function writing(env, text) {
  const pad = createPad({ title: "doc", now: env.now }, env);
  return setPadText(pad, { text }, env);
}

function drillAndStage(pad, env, start, end, result) {
  const text = root(pad).frozenText ?? root(pad).text;
  const d = drillIntoSpan(pad, {
    parentThreadId: null, title: "t", selectionStart: start, selectionEnd: end, selectedText: text.slice(start, end),
  }, env);
  return stageStepOutput(d.pad, { stepId: d.frame.steps[0].id, annotationId: d.annotationId, text: result }, env);
}

describe("enterReflect", () => {
  it("freezes the draft and records it as the first version", () => {
    const env = makeTestEnv();
    const pad = enterReflect(writing(env, "Overload matters most."), {}, env);
    expect(root(pad).phase).toBe("cultivate");
    expect(root(pad).frozenText).toBe("Overload matters most.");
    expect(root(pad).draftHistory).toEqual([
      expect.objectContaining({ n: 0, text: "Overload matters most.", contributions: [] }),
    ]);
  });

  it("records a new version only when the text changed since the last one", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "Overload matters most."), {}, env);
    pad = leaveReflect(pad, {}, env);
    pad = enterReflect(pad, {}, env); // unchanged
    expect(root(pad).draftHistory).toHaveLength(1);
    pad = leaveReflect(pad, {}, env);
    pad = setPadText(pad, { text: "Overload matters most.\n\nVolume drives growth." }, env);
    pad = enterReflect(pad, {}, env);
    expect(root(pad).draftHistory).toHaveLength(2);
    expect(root(pad).draftHistory[1]).toMatchObject({ n: 1, text: "Overload matters most.\n\nVolume drives growth.", pass: "stream" });
  });

  it("is a same-ref no-op when already reflecting, empty, or unknown", () => {
    const env = makeTestEnv();
    const reflecting = enterReflect(writing(env, "x"), {}, env);
    expect(enterReflect(reflecting, {}, env)).toBe(reflecting);
    const empty = createPad({ title: "doc", now: env.now }, env);
    expect(enterReflect(empty, {}, env)).toBe(empty);
    expect(enterReflect(reflecting, { padLocator: "nope" }, env)).toBe(reflecting);
  });

  it("re-finds drilled passages after writing moved them", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "Overload matters most."), {}, env);
    const d = drillIntoSpan(pad, {
      parentThreadId: null, title: "t", selectionStart: 0, selectionEnd: 8, selectedText: "Overload",
    }, env);
    pad = leaveReflect(d.pad, {}, env);
    pad = setPadText(pad, { text: "I think progressive Overload matters most." }, env);
    pad = enterReflect(pad, {}, env);
    const ann = root(pad).annotations.find((a) => a.id === d.annotationId);
    expect(ann).toMatchObject({ selectionStart: 20, selectionEnd: 28, selectedText: "Overload" });
    expect(ann.lost).toBeFalsy();
  });
});

describe("leaveReflect", () => {
  it("returns to writing", () => {
    const env = makeTestEnv();
    const pad = leaveReflect(enterReflect(writing(env, "x"), {}, env), {}, env);
    expect(root(pad).phase).toBe("stream");
    expect(root(pad).staged).toEqual([]);
  });

  it("applies waiting results first, as a new version", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "The plan is a mess."), {}, env);
    pad = drillAndStage(pad, env, 14, 18, "set of open questions");
    pad = leaveReflect(pad, {}, env);
    expect(root(pad).phase).toBe("stream");
    expect(root(pad).text).toBe("The plan is a set of open questions.");
    expect(root(pad).draftHistory.map((h) => h.text)).toEqual([
      "The plan is a mess.",
      "The plan is a set of open questions.",
    ]);
  });

  it("refuses (same ref) while waiting results overlap", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "The plan is a mess of loose ends."), {}, env);
    pad = drillAndStage(pad, env, 14, 18, "tangle");
    pad = drillAndStage(pad, env, 12, 32, "pile of open questions");
    expect(leaveReflect(pad, {}, env)).toBe(pad);
  });

  it("is a same-ref no-op when already writing", () => {
    const env = makeTestEnv();
    const pad = writing(env, "x");
    expect(leaveReflect(pad, {}, env)).toBe(pad);
  });
});

describe("writing keeps passages anchored", () => {
  it("setPadText re-finds annotated passages as the text changes", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "Overload matters most."), {}, env);
    const d = drillIntoSpan(pad, {
      parentThreadId: null, title: "t", selectionStart: 0, selectionEnd: 8, selectedText: "Overload",
    }, env);
    pad = leaveReflect(d.pad, {}, env);
    pad = setPadText(pad, { text: "Progressive Overload matters most." }, env);
    expect(root(pad).annotations.find((a) => a.id === d.annotationId)).toMatchObject({ selectionStart: 12, selectionEnd: 20 });
  });
});

describe("reanchorAnnotations", () => {
  const ann = (id, s, e, t) => ({ id, selectionStart: s, selectionEnd: e, selectedText: t });

  it("keeps a passage that is still where it was (same ref)", () => {
    const anns = [ann("a", 4, 8, "mess")];
    expect(reanchorAnnotations("the mess", anns)).toBe(anns);
  });

  it("moves a passage to the occurrence nearest its old position", () => {
    const out = reanchorAnnotations("mess one. new text. mess two.", [ann("a", 18, 22, "mess")]);
    expect(out[0]).toMatchObject({ selectionStart: 20, selectionEnd: 24 });
  });

  it("marks a passage whose words are gone as lost, and clears that once found again", () => {
    const lost = reanchorAnnotations("all rewritten", [ann("a", 4, 8, "mess")]);
    expect(lost[0].lost).toBe(true);
    const found = reanchorAnnotations("a mess again", lost);
    expect(found[0]).toMatchObject({ selectionStart: 2, selectionEnd: 6 });
    expect(found[0].lost).toBeUndefined();
  });

  it("leaves annotations without anchor text alone", () => {
    const anns = [{ id: "pin", selectionStart: 0, selectionEnd: 0 }];
    expect(reanchorAnnotations("anything", anns)).toBe(anns);
  });
});

describe("advanceToNextDraft keeps the paragraph list in step", () => {
  it("reconciles ideas and frozenIdeas from the revealed text, keeping ids", () => {
    const env = makeTestEnv();
    let pad = enterReflect(writing(env, "The plan is a mess."), {}, env);
    const idBefore = root(pad).ideas[0].id;
    pad = drillAndStage(pad, env, 14, 18, "set of open questions");
    pad = advanceToNextDraft(pad, {}, env);
    expect(root(pad).ideas.map((i) => i.text)).toEqual(["The plan is a set of open questions."]);
    expect(root(pad).frozenIdeas.map((i) => i.text)).toEqual(["The plan is a set of open questions."]);
    expect(root(pad).ideas[0].id).toBe(idBefore);
  });
});
