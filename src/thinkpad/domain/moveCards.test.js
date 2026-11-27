// ---------------------------------------------------------------------------
// Move cards — the moves of one level, shaped for a comment-style margin, and
// answering a move from its card without opening its thread.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  drillIntoSpan,
  stampDraft,
  markNeedsSource,
  openItems,
  drillThreadsAt,
  padForThread,
} from "./padDomain";
import { moveCardsAt, answerMove } from "./moveCards";
import { makeTestEnv } from "./__testkit__";

const TEXT = "alpha beta gamma delta";

function rootPad(env) {
  const pad = createPad({ title: "doc", now: env.now }, env);
  return setPadText(pad, { padLocator: null, text: TEXT }, env);
}

function drill(pad, env, { parent = null, title = "work it", word = "beta", text = TEXT } = {}) {
  const start = text.indexOf(word);
  return drillIntoSpan(pad, {
    parentThreadId: parent, title, selectionStart: start, selectionEnd: start + word.length, selectedText: word,
  }, env);
}

describe("moveCardsAt", () => {
  it("is empty for no pad and for a pad with no moves", () => {
    const env = makeTestEnv();
    expect(moveCardsAt(null)).toEqual([]);
    expect(moveCardsAt(rootPad(env), null)).toEqual([]);
  });

  it("gives a card per thread with its passage, its state and the last line written in it", () => {
    const env = makeTestEnv();
    let { pad, frame, annotationId } = drill(rootPad(env), env, { title: "Why beta?" });
    pad = setPadText(pad, { padLocator: frame.id, text: "first thought\nsecond thought\n" }, env);
    expect(moveCardsAt(pad, null)).toEqual([
      {
        id: annotationId,
        kind: "thread",
        threadId: frame.id,
        tag: null,
        title: "Why beta?",
        passage: "beta",
        latest: "second thought",
        result: "",
        status: "converged",
        openInside: 0,
        caveats: 0,
        canAnswer: true,
        span: { selectionStart: 6, selectionEnd: 10, selectedText: "beta" },
      },
    ]);
  });

  it("orders cards by where their passage sits, and includes needs-a-source", () => {
    const env = makeTestEnv();
    let { pad } = drill(rootPad(env), env, { word: "gamma" });
    pad = markNeedsSource(pad, { padLocator: null, selectionStart: 0, selectionEnd: 5, selectedText: "alpha" }, env);
    const cards = moveCardsAt(pad, null);
    expect(cards.map((c) => [c.kind, c.passage])).toEqual([["source", "alpha"], ["thread", "gamma"]]);
    expect(cards[0].canAnswer).toBe(false);
  });

  it("cannot be answered while the thread has open items inside", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: frame.id, text: "inner thought here" }, env);
    pad = drill(pad, env, { parent: frame.id, word: "thought", text: "inner thought here" }).pad;
    const [card] = moveCardsAt(pad, null);
    expect(card.openInside).toBe(1);
    expect(card.canAnswer).toBe(false);
  });
});

describe("answerMove", () => {
  it("in Reflect, keeps the result waiting for the next draft and settles the move", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = stampDraft(pad, { padLocator: null }, env);
    const next = answerMove(pad, { padLocator: null, threadId: frame.id, result: "  beta holds  " }, env);
    expect(padForThread(next, null).text).toBe(TEXT); // the frozen draft is untouched
    expect(padForThread(next, null).staged.map((s) => s.text)).toEqual(["beta holds"]);
    expect(openItems(next, null)).toEqual([]);
    const [card] = moveCardsAt(next, null);
    expect(card.status).toBe("resolved");
    expect(card.result).toBe("beta holds");
    expect(card.canAnswer).toBe(false);
  });

  it("while writing, puts the result straight into the text", () => {
    const env = makeTestEnv();
    const { pad, frame } = drill(rootPad(env), env);
    const next = answerMove(pad, { padLocator: null, threadId: frame.id, result: "BETA" }, env);
    expect(padForThread(next, null).text).toContain("BETA");
    expect(drillThreadsAt(next, null)[0].status).toBe("resolved");
  });

  it("returns the same pad for an empty result, an unknown thread, or one already resolved", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = stampDraft(pad, { padLocator: null }, env);
    expect(answerMove(pad, { threadId: frame.id, result: "   " }, env)).toBe(pad);
    expect(answerMove(pad, { threadId: "nope", result: "x" }, env)).toBe(pad);
    const done = answerMove(pad, { threadId: frame.id, result: "x" }, env);
    expect(answerMove(done, { threadId: frame.id, result: "y" }, env)).toBe(done);
  });

  it("refuses while the thread has open items inside (the gate)", () => {
    const env = makeTestEnv();
    let { pad, frame } = drill(rootPad(env), env);
    pad = setPadText(pad, { padLocator: frame.id, text: "inner thought here" }, env);
    pad = drill(pad, env, { parent: frame.id, word: "thought", text: "inner thought here" }).pad;
    expect(answerMove(pad, { threadId: frame.id, result: "x" }, env)).toBe(pad);
  });
});
