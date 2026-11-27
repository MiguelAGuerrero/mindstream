// ---------------------------------------------------------------------------
// Move cards — the moves made at one level, shaped for a comment-style margin
// beside the page, and answering a move from its card.
//
// A card is a cue, never the thread itself: it carries the passage, the last
// line written in the thread and its state. Longer work still happens in the
// thread's own page.
// ---------------------------------------------------------------------------

import {
  padForThread,
  drillThreadsAt,
  openItems,
  withCaveats,
  setStepOutput,
  stageStepOutput,
  resolveThreadIntoParent,
  discardThread,
} from "./thinkPadModel";

function lastLine(text) {
  const lines = (typeof text === "string" ? text : "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

function spanOf(annotation) {
  return {
    selectionStart: annotation?.selectionStart ?? 0,
    selectionEnd: annotation?.selectionEnd ?? 0,
    selectedText: annotation?.selectedText ?? "",
  };
}

/**
 * The cards of one level (null = root document, a thread id = its sub-pad), in
 * the order their passages sit in the text:
 *   { id, kind: "thread", threadId, tag, title, passage, latest, result,
 *     status: "open" | "converged" | "resolved", openInside, caveats, canAnswer,
 *     canRemove, span }
 *   { id, kind: "source", passage, status: "open", canAnswer: false, span }
 * canAnswer: the move can take a result from its card (not resolved, and
 * nothing undecided inside its thread). canRemove: nothing was written in its
 * thread, so the move can be taken back. [] for no pad or an unknown level.
 */
export function moveCardsAt(pad, padLocator = null) {
  if (!pad) return [];
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  const annotations = doc.annotations ?? [];
  const byId = new Map(annotations.map((a) => [a.id, a]));
  const staged = doc.staged ?? [];

  const threads = drillThreadsAt(pad, padLocator)
    .filter((t) => byId.get(t.annotationId)?.hidden !== true)
    .map((t) => {
      const ann = byId.get(t.annotationId);
      const resolved = t.status === "resolved";
      const openInside = resolved ? 0 : openItems(pad, t.threadId).length;
      const waiting = staged.find((s) => s.annotationId === t.annotationId);
      const result = !resolved ? "" : waiting?.text ?? (ann?.originalText ? ann.selectedText ?? "" : "");
      return {
        id: t.annotationId,
        kind: "thread",
        threadId: t.threadId,
        tag: t.tag,
        title: t.title,
        passage: t.anchorText,
        latest: lastLine(padForThread(pad, t.threadId)?.text),
        result,
        status: t.status,
        openInside,
        caveats: t.caveats,
        canAnswer: !resolved && openInside === 0,
        canRemove: !resolved && !t.hasWork && openInside === 0,
        span: spanOf(ann),
      };
    });

  const sources = openItems(pad, padLocator)
    .filter((i) => i.kind === "source")
    .map((i) => ({
      id: i.id,
      kind: "source",
      passage: i.text,
      status: "open",
      canAnswer: false,
      span: spanOf(byId.get(i.id)),
    }));

  return [...threads, ...sources]
    .map((card, i) => ({ card, i }))
    .sort((a, b) => a.card.span.selectionStart - b.card.span.selectionStart || a.i - b.i)
    .map(({ card }) => card);
}

/**
 * Answer a move from its card: `result` resolves the thread into the level it
 * was started from, without opening it. A level in Reflect keeps the result
 * waiting for its next draft; a level being written takes it straight into the
 * text. The thread's own text stays as the archived working-out.
 * Same pad for an empty result, an unknown or already-resolved thread, or a
 * thread with undecided open items inside (the gate holds here too).
 */
export function answerMove(pad, { padLocator = null, threadId, result } = {}, { now, makeId } = {}) {
  if (!pad || typeof threadId !== "string" || !threadId) return pad;
  const text = typeof result === "string" ? result.trim() : "";
  if (!text) return pad;
  const thread = drillThreadsAt(pad, padLocator).find((t) => t.threadId === threadId);
  if (!thread || thread.status === "resolved") return pad;
  if (openItems(pad, threadId).length) return pad;

  const doc = padForThread(pad, padLocator);
  if (doc?.phase !== "cultivate") {
    const direct = resolveThreadIntoParent(pad, { threadId, result: text }, { now, makeId });
    return direct.resolved ? direct.pad : pad;
  }
  const stepId = (doc.annotations ?? []).find((a) => a.id === thread.annotationId)?.stepId;
  if (typeof stepId !== "string" || !stepId) return pad;
  let next = withCaveats(pad, threadId, { now });
  next = setStepOutput(next, { stepId, output: text }, { now });
  return stageStepOutput(next, { stepId, annotationId: thread.annotationId, text, padLocator }, { now, makeId });
}

/**
 * Take back a move that has no work in it: its thread and its mark on the
 * passage go. Same pad when the thread holds anything (text, moves, a result).
 */
export function removeMove(pad, { threadId } = {}, { now } = {}) {
  return discardThread(pad, threadId, { now, evenTagged: true });
}
