// ---------------------------------------------------------------------------
// Write more — the append-only escape hatch from Reflect back to writing (G4).
//
// Settled in roadmap Revision 11: going back to writing adds new text AFTER the
// frozen draft; the frozen text is never reopened. Because the addition only
// ever lands at the end, every anchor offset into the frozen text stays valid
// and staged results survive untouched.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  stampDraft,
  padForThread,
  drillIntoSpan,
  stageStepOutput,
  advanceToNextDraft,
  beginWriteMore,
  setWriteMoreText,
  cancelWriteMore,
  addWriteMore,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

function reflectingPad(env, text = "The plan is a mess.") {
  let pad = createPad({ title: "doc", now: env.now }, env);
  pad = setPadText(pad, { text }, env);
  return stampDraft(pad, {}, env);
}

const root = (pad) => padForThread(pad, null);

describe("beginWriteMore", () => {
  it("opens an empty writing area on a frozen draft", () => {
    const env = makeTestEnv();
    const pad = beginWriteMore(reflectingPad(env), {}, env);
    expect(root(pad).writeMore).toBe("");
    expect(root(pad).phase).toBe("cultivate"); // the draft stays frozen
  });

  it("is a same-ref no-op in Stream, when already open, or for an unknown level", () => {
    const env = makeTestEnv();
    let streaming = createPad({ title: "doc", now: env.now }, env);
    streaming = setPadText(streaming, { text: "still writing" }, env);
    expect(beginWriteMore(streaming, {}, env)).toBe(streaming);
    const open = beginWriteMore(reflectingPad(env), {}, env);
    expect(beginWriteMore(open, {}, env)).toBe(open);
    expect(beginWriteMore(open, { padLocator: "nope" }, env)).toBe(open);
  });
});

describe("setWriteMoreText / cancelWriteMore", () => {
  it("records the text while open and drops it on cancel, leaving the draft alone", () => {
    const env = makeTestEnv();
    const before = reflectingPad(env);
    let pad = beginWriteMore(before, {}, env);
    pad = setWriteMoreText(pad, { text: "One more thought." }, env);
    expect(root(pad).writeMore).toBe("One more thought.");
    pad = cancelWriteMore(pad, {}, env);
    expect(root(pad).writeMore).toBe(null);
    expect(root(pad).frozenText).toBe(root(before).frozenText);
  });

  it("ignores text when the area is closed, and same-ref on unchanged text", () => {
    const env = makeTestEnv();
    const closed = reflectingPad(env);
    expect(setWriteMoreText(closed, { text: "x" }, env)).toBe(closed);
    const open = setWriteMoreText(beginWriteMore(closed, {}, env), { text: "x" }, env);
    expect(setWriteMoreText(open, { text: "x" }, env)).toBe(open);
    expect(cancelWriteMore(closed, {}, env)).toBe(closed);
  });
});

describe("addWriteMore", () => {
  it("appends the text after the frozen draft as new paragraphs, and closes the area", () => {
    const env = makeTestEnv();
    let pad = beginWriteMore(reflectingPad(env), {}, env);
    pad = setWriteMoreText(pad, { text: "Owners are unclear.\n\nDates slip." }, env);
    pad = addWriteMore(pad, {}, env);
    const doc = root(pad);
    expect(doc.frozenText).toBe("The plan is a mess.\n\nOwners are unclear.\n\nDates slip.");
    expect(doc.text).toBe(doc.frozenText);
    expect(doc.frozenIdeas.map((i) => i.text)).toEqual(["The plan is a mess.", "Owners are unclear.", "Dates slip."]);
    expect(doc.ideas.map((i) => i.text)).toEqual(doc.frozenIdeas.map((i) => i.text));
    expect(doc.phase).toBe("cultivate");
    expect(doc.writeMore).toBe(null);
  });

  it("keeps the ids of existing paragraphs", () => {
    const env = makeTestEnv();
    const before = reflectingPad(env);
    let pad = setWriteMoreText(beginWriteMore(before, {}, env), { text: "More." }, env);
    pad = addWriteMore(pad, {}, env);
    expect(root(pad).frozenIdeas[0].id).toBe(root(before).frozenIdeas[0].id);
  });

  it("records a stream pass in draft history, seeding the original draft first", () => {
    const env = makeTestEnv();
    let pad = setWriteMoreText(beginWriteMore(reflectingPad(env), {}, env), { text: "More." }, env);
    pad = addWriteMore(pad, {}, env);
    const history = root(pad).draftHistory;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ n: 0, text: "The plan is a mess.", contributions: [] });
    expect(history[0].pass).toBeUndefined();
    expect(history[1]).toMatchObject({ n: 1, text: "The plan is a mess.\n\nMore.", contributions: [], pass: "stream" });
  });

  it("closes without a new version when the text is blank", () => {
    const env = makeTestEnv();
    const before = reflectingPad(env);
    let pad = setWriteMoreText(beginWriteMore(before, {}, env), { text: "   \n\n " }, env);
    pad = addWriteMore(pad, {}, env);
    expect(root(pad).writeMore).toBe(null);
    expect(root(pad).frozenText).toBe(root(before).frozenText);
    expect(root(pad).draftHistory).toEqual([]);
  });

  it("is a same-ref no-op when the area is not open", () => {
    const env = makeTestEnv();
    const closed = reflectingPad(env);
    expect(addWriteMore(closed, {}, env)).toBe(closed);
  });

  it("keeps a staged result, which still lands on its passage at the next draft", () => {
    const env = makeTestEnv();
    let pad = reflectingPad(env, "The plan is a mess.");
    const drilled = drillIntoSpan(pad, {
      parentThreadId: null, title: "the mess", selectionStart: 14, selectionEnd: 18, selectedText: "mess",
    }, env);
    pad = stageStepOutput(drilled.pad, {
      stepId: drilled.frame.steps[0].id, annotationId: drilled.annotationId, text: "set of open questions",
    }, env);
    expect(root(pad).staged).toHaveLength(1);

    pad = setWriteMoreText(beginWriteMore(pad, {}, env), { text: "Dates slip." }, env);
    pad = addWriteMore(pad, {}, env);
    expect(root(pad).staged).toHaveLength(1);

    pad = advanceToNextDraft(pad, {}, env);
    expect(root(pad).text).toBe("The plan is a set of open questions.\n\nDates slip.");
  });

  it("Next Draft keeps the paragraph list in step with the revealed text, keeping ids", () => {
    const env = makeTestEnv();
    let pad = reflectingPad(env, "The plan is a mess.");
    const idBefore = root(pad).ideas[0].id;
    const drilled = drillIntoSpan(pad, {
      parentThreadId: null, title: "the mess", selectionStart: 14, selectionEnd: 18, selectedText: "mess",
    }, env);
    pad = stageStepOutput(drilled.pad, {
      stepId: drilled.frame.steps[0].id, annotationId: drilled.annotationId, text: "set of open questions",
    }, env);
    pad = advanceToNextDraft(pad, {}, env);
    expect(root(pad).ideas.map((i) => i.text)).toEqual(["The plan is a set of open questions."]);
    expect(root(pad).frozenIdeas.map((i) => i.text)).toEqual(["The plan is a set of open questions."]);
    expect(root(pad).ideas[0].id).toBe(idBefore);
  });

  it("builds on the revealed draft after a Next Draft, not the draft before it", () => {
    const env = makeTestEnv();
    let pad = reflectingPad(env, "The plan is a mess.");
    const drilled = drillIntoSpan(pad, {
      parentThreadId: null, title: "the mess", selectionStart: 14, selectionEnd: 18, selectedText: "mess",
    }, env);
    pad = stageStepOutput(drilled.pad, {
      stepId: drilled.frame.steps[0].id, annotationId: drilled.annotationId, text: "set of open questions",
    }, env);
    pad = advanceToNextDraft(pad, {}, env);
    expect(root(pad).frozenText).toBe("The plan is a set of open questions.");

    pad = setWriteMoreText(beginWriteMore(pad, {}, env), { text: "Dates slip." }, env);
    pad = addWriteMore(pad, {}, env);
    expect(root(pad).frozenText).toBe("The plan is a set of open questions.\n\nDates slip.");
    expect(root(pad).text).toBe(root(pad).frozenText);
    expect(root(pad).frozenIdeas.map((i) => i.text)).toEqual(["The plan is a set of open questions.", "Dates slip."]);
  });

  it("works in a sub-pad", () => {
    const env = makeTestEnv();
    let pad = reflectingPad(env);
    const drilled = drillIntoSpan(pad, {
      parentThreadId: null, title: "the mess", selectionStart: 14, selectionEnd: 18, selectedText: "mess",
    }, env);
    const id = drilled.frame.id;
    pad = setPadText(drilled.pad, { padLocator: id, text: "Three loose ends." }, env);
    pad = stampDraft(pad, { padLocator: id }, env);
    pad = setWriteMoreText(beginWriteMore(pad, { padLocator: id }, env), { padLocator: id, text: "And a fourth." }, env);
    pad = addWriteMore(pad, { padLocator: id }, env);
    expect(padForThread(pad, id).frozenText).toBe("Three loose ends.\n\nAnd a fourth.");
    expect(root(pad).frozenText).toBe("The plan is a mess."); // the root is untouched
  });
});

describe("persistence", () => {
  it("keeps half-written text and the stream-pass marker across a save and load", () => {
    const env = makeTestEnv();
    let pad = setWriteMoreText(beginWriteMore(reflectingPad(env), {}, env), { text: "More." }, env);
    pad = addWriteMore(pad, {}, env);
    pad = setWriteMoreText(beginWriteMore(pad, {}, env), { text: "Half a thought" }, env);
    const loaded = normalizePad(JSON.parse(JSON.stringify(buildPadSnapshot(pad))), { now: env.now });
    expect(root(loaded).writeMore).toBe("Half a thought");
    expect(root(loaded).draftHistory[1].pass).toBe("stream");
    expect(root(loaded).draftHistory[0].pass).toBeUndefined();
  });

  it("loads an older record with no writeMore field as closed", () => {
    const env = makeTestEnv();
    const old = buildPadSnapshot(reflectingPad(env));
    delete old.doc.writeMore;
    expect(root(normalizePad(old, { now: env.now })).writeMore).toBe(null);
  });
});
