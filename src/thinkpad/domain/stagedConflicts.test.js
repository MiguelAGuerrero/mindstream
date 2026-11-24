// ---------------------------------------------------------------------------
// Overlapping staged results at reveal (D6; stream-reflect-lifecycle.md §10.8).
//
// Two results staged against overlapping text would splice over each other.
// The reveal is blocked until each overlap is settled by keeping one result;
// the others leave staging, and their threads stay so they can be reopened.
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
  stagedConflicts,
  unstageOutput,
} from "./padDomain";
import { makeTestEnv } from "./__testkit__";

const TEXT = "The plan is a mess of loose ends.";

function stageOn(pad, env, start, end, result) {
  const d = drillIntoSpan(pad, {
    parentThreadId: null, title: TEXT.slice(start, end), selectionStart: start, selectionEnd: end, selectedText: TEXT.slice(start, end),
  }, env);
  const next = stageStepOutput(d.pad, { stepId: d.frame.steps[0].id, annotationId: d.annotationId, text: result }, env);
  const staged = padForThread(next, null).staged;
  return { pad: next, stagedId: staged[staged.length - 1].id, threadId: d.frame.id };
}

function reflecting(env) {
  let pad = createPad({ title: "doc", now: env.now }, env);
  pad = setPadText(pad, { text: TEXT }, env);
  return stampDraft(pad, {}, env);
}

describe("stagedConflicts", () => {
  it("is empty when staged results touch separate text", () => {
    const env = makeTestEnv();
    let { pad } = stageOn(reflecting(env), env, 14, 18, "tangle");      // "mess"
    ({ pad } = stageOn(pad, env, 22, 32, "open questions"));            // "loose ends"
    expect(stagedConflicts(pad, null)).toEqual([]);
  });

  it("groups results whose anchors overlap", () => {
    const env = makeTestEnv();
    let a = stageOn(reflecting(env), env, 14, 18, "tangle");            // "mess"
    let b = stageOn(a.pad, env, 12, 32, "pile of open questions");      // "a mess of loose ends"
    const conflicts = stagedConflicts(b.pad, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].map((c) => c.stagedId).sort()).toEqual([a.stagedId, b.stagedId].sort());
    expect(conflicts[0].find((c) => c.stagedId === a.stagedId)).toMatchObject({ source: "mess", text: "tangle" });
  });

  it("treats spans that only touch end-to-start as separate", () => {
    const env = makeTestEnv();
    let { pad } = stageOn(reflecting(env), env, 14, 18, "tangle");      // "mess"
    ({ pad } = stageOn(pad, env, 18, 21, " made"));                     // " of"
    expect(stagedConflicts(pad, null)).toEqual([]);
  });

  it("returns [] for no pad or an unknown level", () => {
    expect(stagedConflicts(null, null)).toEqual([]);
    const env = makeTestEnv();
    expect(stagedConflicts(reflecting(env), "nope")).toEqual([]);
  });
});

describe("advanceToNextDraft with overlaps", () => {
  it("refuses (same ref) while staged results overlap", () => {
    const env = makeTestEnv();
    let { pad } = stageOn(reflecting(env), env, 14, 18, "tangle");
    ({ pad } = stageOn(pad, env, 12, 32, "pile of open questions"));
    expect(advanceToNextDraft(pad, {}, env)).toBe(pad);
  });
});

describe("unstageOutput", () => {
  it("removes one result from staging, keeps its thread, and unblocks the reveal", () => {
    const env = makeTestEnv();
    const a = stageOn(reflecting(env), env, 14, 18, "tangle");
    const b = stageOn(a.pad, env, 12, 32, "pile of open questions");
    let pad = unstageOutput(b.pad, { stagedId: a.stagedId }, env);
    expect(padForThread(pad, null).staged.map((s) => s.id)).toEqual([b.stagedId]);
    expect(pad.threads.some((t) => t.id === a.threadId)).toBe(true);
    expect(stagedConflicts(pad, null)).toEqual([]);
    pad = advanceToNextDraft(pad, {}, env);
    expect(padForThread(pad, null).text).toBe("The plan is pile of open questions.");
  });

  it("is a same-ref no-op for an unknown id", () => {
    const env = makeTestEnv();
    const { pad } = stageOn(reflecting(env), env, 14, 18, "tangle");
    expect(unstageOutput(pad, { stagedId: "nope" }, env)).toBe(pad);
  });
});
