// Revision history (roadmap Revision 34): each draft, newest first, with the
// moves that made it, read from what the drafts already record.

import { describe, expect, it } from "vitest";
import {
  createPad, setPadText, enterReflect, leaveReflect, drillIntoSpan, setStepOutput,
  stageStepOutput, advanceToNextDraft, startSynthesis, revisionHistory,
} from "./padDomain";
import { makeTestEnv } from "./__testkit__";

const TEXT = "Rewards felt coercive.\n\nThe imagery did not explain the app.";

function reflecting(env) {
  let pad = createPad({ title: "Why did it feel off?", now: env.now }, env);
  pad = setPadText(pad, { text: TEXT }, env);
  return enterReflect(pad, {}, env);
}

function resolveInto(pad, env, words, result) {
  const start = TEXT.indexOf(words);
  const d = drillIntoSpan(pad, {
    parentThreadId: null, title: `Work on ${words}`, selectionStart: start,
    selectionEnd: start + words.length, selectedText: words,
  }, env);
  const step = d.frame.steps[0];
  let next = setStepOutput(d.pad, { stepId: step.id, output: result }, env);
  next = stageStepOutput(next, { stepId: step.id, annotationId: d.annotationId, text: result }, env);
  return next;
}

describe("revisionHistory", () => {
  it("is empty before the first Reflect", () => {
    const env = makeTestEnv();
    const pad = setPadText(createPad({ title: "x", now: env.now }, env), { text: TEXT }, env);
    expect(revisionHistory(pad)).toEqual([]);
  });

  it("starts with the first draft", () => {
    const env = makeTestEnv();
    expect(revisionHistory(reflecting(env))).toEqual([
      expect.objectContaining({ n: 0, kind: "first", words: 10, wordDelta: 0, moves: [] }),
    ]);
  });

  it("lists the threads resolved into a draft, newest draft first", () => {
    const env = makeTestEnv();
    let pad = resolveInto(reflecting(env), env, "coercive", "pushy");
    pad = advanceToNextDraft(pad, {}, env);
    const [latest, first] = revisionHistory(pad);
    expect(first.kind).toBe("first");
    expect(latest).toMatchObject({ n: 1, kind: "reflect", wordDelta: 0 });
    expect(latest.moves).toEqual([
      expect.objectContaining({ kind: "resolved", title: "Work on coercive", passage: "coercive", result: "pushy" }),
    ]);
  });

  it("counts the words a writing pass added", () => {
    const env = makeTestEnv();
    let pad = leaveReflect(reflecting(env), {}, env);
    pad = setPadText(pad, { text: `${TEXT}\n\nIt never showed what I was doing.` }, env);
    pad = enterReflect(pad, {}, env);
    expect(revisionHistory(pad)[0]).toMatchObject({ kind: "writing", wordDelta: 7, moves: [] });
  });

  it("marks a synthesis", () => {
    const env = makeTestEnv();
    const s = startSynthesis(reflecting(env), {}, env);
    const step = s.frame.steps[0];
    let pad = setStepOutput(s.pad, { stepId: step.id, output: "The app pushed instead of showing." }, env);
    pad = stageStepOutput(pad, { stepId: step.id, annotationId: s.frame.parentAnchor.annotationId, text: "The app pushed instead of showing." }, env);
    pad = advanceToNextDraft(pad, {}, env);
    expect(revisionHistory(pad)[0].moves[0]).toMatchObject({ kind: "synthesis", result: "The app pushed instead of showing." });
  });
});
