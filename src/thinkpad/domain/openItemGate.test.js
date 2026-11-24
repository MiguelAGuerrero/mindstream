// ---------------------------------------------------------------------------
// Open-item gate — docs/capture-templates-proposal.md §8.
//
// An open item is a move you started at a level that hasn't resolved: an
// anchor annotation with a stepId that is not resolved, not staged for reveal,
// not hidden and has no disposition. Items lifted up from a lower level are
// open items too. A thread cannot resolve up while it has any, and it must
// have converged (one non-empty block).
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  drillIntoSpan,
  captureIdea,
  hideSpan,
  resolveThreadIntoParent,
  stampDraft,
  stageStepOutput,
  openItems,
  disposeOpenItem,
  clearDisposition,
  canResolve,
  decidedItems,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

/** A pad whose root text is "alpha beta gamma delta". */
function rootPad(env) {
  const pad = createPad({ title: "doc", now: env.now }, env);
  return setPadText(pad, { padLocator: null, text: "alpha beta gamma delta" }, env);
}

/** Drill `word` of the given pad (null = root) and return { pad, frame, annotationId }. */
function drill(pad, env, { parent = null, title = "work it", word = "beta", text = "alpha beta gamma delta" } = {}) {
  const start = text.indexOf(word);
  return drillIntoSpan(pad, {
    parentThreadId: parent, title, selectionStart: start, selectionEnd: start + word.length, selectedText: word,
  }, env);
}

describe("openItems", () => {
  it("is empty for a fresh pad", () => {
    const env = makeTestEnv();
    expect(openItems(rootPad(env), null)).toEqual([]);
  });

  it("lists an unresolved drill anchor at the level that holds it", () => {
    const env = makeTestEnv();
    const { pad, frame, annotationId } = drill(rootPad(env), env, { title: "Why might this be wrong?" });
    expect(openItems(pad, null)).toEqual([
      {
        id: annotationId,
        kind: "move",
        text: "Why might this be wrong?",
        source: "beta",
        threadId: frame.id,
      },
    ]);
  });

  it("is scoped to one level: a child's anchor is open in the child, not the root", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const child = drill(pad, env, { parent: parent.id, title: "inner move", word: "thought", text: "inner thought here" });
    pad = child.pad;
    expect(openItems(pad, parent.id).map((i) => i.id)).toEqual([child.annotationId]);
    expect(openItems(pad, null).map((i) => i.threadId)).toEqual([parent.id]);
  });

  it("does not count parked ideas or hidden spans (no move started)", () => {
    const env = makeTestEnv();
    let pad = rootPad(env);
    pad = captureIdea(pad, { selectionStart: 0, selectionEnd: 5, selectedText: "alpha" }, env).pad;
    pad = hideSpan(pad, { padLocator: null, selectionStart: 6, selectionEnd: 10, selectedText: "beta" }, env);
    expect(openItems(pad, null)).toEqual([]);
  });

  it("does not count a resolved anchor", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: frame.id, text: "settled" }, env);
    pad = resolveThreadIntoParent(pad, { threadId: frame.id, result: "settled" }, env).pad;
    expect(openItems(pad, null)).toEqual([]);
  });

  it("does not count an anchor whose output is staged for the next reveal", () => {
    const env = makeTestEnv();
    let { pad, frame, annotationId } = drill(rootPad(env), env);
    pad = stampDraft(pad, { padLocator: null }, env);
    pad = stageStepOutput(pad, {
      stepId: frame.steps[0].id, annotationId, text: "settled", padLocator: null,
    }, env);
    expect(openItems(pad, null)).toEqual([]);
  });

  it("returns [] for an unknown level", () => {
    const env = makeTestEnv();
    expect(openItems(rootPad(env), "thread:nope")).toEqual([]);
  });
});

describe("disposeOpenItem", () => {
  it("accepts an item as room for doubt, recording the note, and closes it", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = drill(rootPad(env), env);
    const next = disposeOpenItem(pad, {
      padLocator: null, id: annotationId, kind: "accepted", note: "  not checked against seasonality ",
    }, env);
    expect(openItems(next, null)).toEqual([]);
    const ann = next.doc.annotations.find((a) => a.id === annotationId);
    expect(ann.disposition).toEqual({
      kind: "accepted", note: "not checked against seasonality", target: null, at: env.now,
    });
  });

  it("parks an item as its own work and closes it", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = drill(rootPad(env), env);
    const next = disposeOpenItem(pad, { padLocator: null, id: annotationId, kind: "parked" }, env);
    expect(openItems(next, null)).toEqual([]);
    expect(next.doc.annotations[0].disposition.kind).toBe("parked");
  });

  it("is a same-ref no-op for an unknown id, an invalid kind or an already-resolved item", () => {
    const env = makeTestEnv();
    let { pad, frame, annotationId } = drill(rootPad(env), env);
    expect(disposeOpenItem(pad, { padLocator: null, id: "ann:nope", kind: "accepted" }, env)).toBe(pad);
    expect(disposeOpenItem(pad, { padLocator: null, id: annotationId, kind: "ignored" }, env)).toBe(pad);
    pad = setPadText(pad, { padLocator: frame.id, text: "done" }, env);
    pad = resolveThreadIntoParent(pad, { threadId: frame.id, result: "done" }, env).pad;
    expect(disposeOpenItem(pad, { padLocator: null, id: annotationId, kind: "accepted" }, env)).toBe(pad);
  });

  it("does not re-dispose an item that already has a decision", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = drill(rootPad(env), env);
    const accepted = disposeOpenItem(pad, { padLocator: null, id: annotationId, kind: "accepted" }, env);
    expect(disposeOpenItem(accepted, { padLocator: null, id: annotationId, kind: "parked" }, env)).toBe(accepted);
  });

  describe("lift", () => {
    /** root → parent drill → child drill; returns the pad and ids. */
    function twoLevels(env) {
      let { pad, frame: parent } = drill(rootPad(env), env, { title: "parent goal" });
      pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
      const child = drill(pad, env, { parent: parent.id, title: "Is this a general law?", word: "thought", text: "inner thought here" });
      return { pad: child.pad, parent, childAnnotationId: child.annotationId };
    }

    it("closes the item where it was and opens it at the chosen ancestor", () => {
      const env = makeTestEnv();
      const { pad, parent, childAnnotationId } = twoLevels(env);
      const next = disposeOpenItem(pad, {
        padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: null,
      }, env);
      expect(openItems(next, parent.id)).toEqual([]);
      const atRoot = openItems(next, null).filter((i) => i.kind === "lifted");
      expect(atRoot).toEqual([
        {
          id: expect.stringMatching(/^lifted:/),
          kind: "lifted",
          text: "Is this a general law?",
          source: "thought",
          from: { padLocator: parent.id, annotationId: childAnnotationId },
        },
      ]);
    });

    it("uses the note as the lifted item's text when one is given", () => {
      const env = makeTestEnv();
      const { pad, parent, childAnnotationId } = twoLevels(env);
      const next = disposeOpenItem(pad, {
        padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: null, note: "Is 'first win' general?",
      }, env);
      expect(openItems(next, null).find((i) => i.kind === "lifted").text).toBe("Is 'first win' general?");
    });

    it("refuses a target that is not a strict ancestor", () => {
      const env = makeTestEnv();
      const { pad, parent, childAnnotationId } = twoLevels(env);
      // itself
      expect(disposeOpenItem(pad, { padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: parent.id }, env)).toBe(pad);
      // an unknown thread
      expect(disposeOpenItem(pad, { padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: "thread:nope" }, env)).toBe(pad);
      // nothing is above the root
      const rootItem = openItems(pad, null)[0];
      expect(disposeOpenItem(pad, { padLocator: null, id: rootItem.id, kind: "lifted", target: null }, env)).toBe(pad);
    });

    it("a lifted item can itself be decided at its new level", () => {
      const env = makeTestEnv();
      const { pad, parent, childAnnotationId } = twoLevels(env);
      let next = disposeOpenItem(pad, { padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: null }, env);
      const lifted = openItems(next, null).find((i) => i.kind === "lifted");
      next = disposeOpenItem(next, { padLocator: null, id: lifted.id, kind: "parked" }, env);
      expect(openItems(next, null).some((i) => i.kind === "lifted")).toBe(false);
    });
  });
});

describe("clearDisposition", () => {
  it("re-opens an accepted item", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = drill(rootPad(env), env);
    const accepted = disposeOpenItem(pad, { padLocator: null, id: annotationId, kind: "accepted" }, env);
    const cleared = clearDisposition(accepted, { padLocator: null, id: annotationId }, env);
    expect(openItems(cleared, null).map((i) => i.id)).toEqual([annotationId]);
  });

  it("undoing a lift removes the item it opened above, if that is still undecided", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const child = drill(pad, env, { parent: parent.id, word: "thought", text: "inner thought here" });
    const lifted = disposeOpenItem(child.pad, { padLocator: parent.id, id: child.annotationId, kind: "lifted", target: null }, env);
    const undone = clearDisposition(lifted, { padLocator: parent.id, id: child.annotationId }, env);
    expect(openItems(undone, parent.id).map((i) => i.id)).toEqual([child.annotationId]);
    expect(openItems(undone, null).some((i) => i.kind === "lifted")).toBe(false);
  });

  it("refuses to undo a lift once the lifted item was decided above (same ref)", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const child = drill(pad, env, { parent: parent.id, word: "thought", text: "inner thought here" });
    let next = disposeOpenItem(child.pad, { padLocator: parent.id, id: child.annotationId, kind: "lifted", target: null }, env);
    const liftedId = openItems(next, null).find((i) => i.kind === "lifted").id;
    next = disposeOpenItem(next, { padLocator: null, id: liftedId, kind: "accepted" }, env);
    expect(clearDisposition(next, { padLocator: parent.id, id: child.annotationId }, env)).toBe(next);
  });

  it("is a same-ref no-op for an item without a decision", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = drill(rootPad(env), env);
    expect(clearDisposition(pad, { padLocator: null, id: annotationId }, env)).toBe(pad);
  });
});

describe("canResolve", () => {
  it("is false for the root document and for an unknown thread", () => {
    const env = makeTestEnv();
    const pad = rootPad(env);
    expect(canResolve(pad, null)).toBe(false);
    expect(canResolve(pad, "thread:nope")).toBe(false);
  });

  it("is false while the sub-pad is empty", () => {
    const env = makeTestEnv();
    const { pad, frame } = drill(rootPad(env), env);
    expect(canResolve(pad, frame.id)).toBe(false);
  });

  it("is false while the sub-pad has more than one block (not converged)", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: frame.id, text: "one idea\n\nanother idea" }, env);
    expect(canResolve(pad, frame.id)).toBe(false);
  });

  it("is true for a converged sub-pad with no open items", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: frame.id, text: "one clear call" }, env);
    expect(canResolve(pad, frame.id)).toBe(true);
  });

  it("is false while the sub-pad has an undecided open item, true once it is decided", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "one clear call" }, env);
    const child = drill(pad, env, { parent: parent.id, word: "clear", text: "one clear call" });
    pad = child.pad;
    expect(canResolve(pad, parent.id)).toBe(false);
    pad = disposeOpenItem(pad, { padLocator: parent.id, id: child.annotationId, kind: "accepted" }, env);
    expect(canResolve(pad, parent.id)).toBe(true);
  });

  it("is false while an item lifted into the thread is undecided", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "one clear call" }, env);
    let mid = drill(pad, env, { parent: parent.id, word: "clear", text: "one clear call" });
    pad = setPadText(mid.pad, { padLocator: mid.frame.id, text: "deep detail" }, env);
    const deep = drill(pad, env, { parent: mid.frame.id, word: "detail", text: "deep detail" });
    pad = disposeOpenItem(deep.pad, { padLocator: mid.frame.id, id: deep.annotationId, kind: "lifted", target: parent.id }, env);
    pad = disposeOpenItem(pad, { padLocator: parent.id, id: mid.annotationId, kind: "accepted" }, env);
    expect(canResolve(pad, parent.id)).toBe(false);
    const lifted = openItems(pad, parent.id).find((i) => i.kind === "lifted");
    pad = disposeOpenItem(pad, { padLocator: parent.id, id: lifted.id, kind: "parked" }, env);
    expect(canResolve(pad, parent.id)).toBe(true);
  });
});

describe("persistence", () => {
  it("dispositions and lifted items survive a snapshot round-trip", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const child = drill(pad, env, { parent: parent.id, word: "thought", text: "inner thought here" });
    pad = disposeOpenItem(child.pad, { padLocator: parent.id, id: child.annotationId, kind: "lifted", target: null, note: "big one" }, env);

    const restored = normalizePad(buildPadSnapshot(pad, env), env);
    expect(openItems(restored, parent.id)).toEqual([]);
    expect(openItems(restored, null).find((i) => i.kind === "lifted")).toMatchObject({ text: "big one" });
    const ann = restored.threads[0].doc.annotations.find((a) => a.id === child.annotationId);
    expect(ann.disposition).toEqual({ kind: "lifted", note: "big one", target: null, at: env.now });
  });
});

describe("decidedItems", () => {
  it("lists the items at a level that have a decision, with that decision", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const a = drill(pad, env, { parent: parent.id, title: "first", word: "inner", text: "inner thought here" });
    const b = drill(a.pad, env, { parent: parent.id, title: "second", word: "here", text: "inner thought here" });
    pad = disposeOpenItem(b.pad, { padLocator: parent.id, id: a.annotationId, kind: "accepted", note: "ok" }, env);
    expect(decidedItems(pad, parent.id)).toEqual([
      {
        id: a.annotationId,
        kind: "move",
        text: "first",
        source: "inner",
        disposition: { kind: "accepted", note: "ok", target: null, at: env.now },
      },
    ]);
    expect(openItems(pad, parent.id).map((i) => i.id)).toEqual([b.annotationId]);
  });

  it("includes decided lifted items, and is [] for an unknown level", () => {
    const env = makeTestEnv();
    let { pad, frame: parent } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: parent.id, text: "inner thought here" }, env);
    const child = drill(pad, env, { parent: parent.id, word: "thought", text: "inner thought here" });
    pad = disposeOpenItem(child.pad, { padLocator: parent.id, id: child.annotationId, kind: "lifted", target: null }, env);
    const liftedId = openItems(pad, null).find((i) => i.kind === "lifted").id;
    pad = disposeOpenItem(pad, { padLocator: null, id: liftedId, kind: "parked" }, env);
    expect(decidedItems(pad, null).map((i) => [i.id, i.kind, i.disposition.kind])).toEqual([[liftedId, "lifted", "parked"]]);
    expect(decidedItems(pad, "thread:nope")).toEqual([]);
  });
});
