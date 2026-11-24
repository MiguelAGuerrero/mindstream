// ---------------------------------------------------------------------------
// Revision history (roadmap Revision 34).
//
// Each draft of a level, newest first, with the moves that made it: a writing
// pass (how many words it added or removed), or the thread results that went
// into it (and whether it was a synthesis). Read straight from what every
// draft already records; nothing new is saved. Tapping an entry previews
// that draft.
// ---------------------------------------------------------------------------

import { padForThread } from "./thinkPadModel";

function wordCount(text) {
  const t = String(text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function oneLine(text, max = 140) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function threadFor(pad, contribution) {
  return (pad?.threads ?? []).find(
    (t) =>
      (contribution.annotationId && t.parentAnchor?.annotationId === contribution.annotationId) ||
      (contribution.stepId && (t.steps ?? []).some((s) => s.id === contribution.stepId)),
  ) ?? null;
}

/**
 * The drafts of one level, newest first:
 * [{ n, at, kind: "first" | "writing" | "reflect", words, wordDelta, moves }]
 * where a move is { kind: "resolved" | "synthesis", title, passage, result, tag, caveats }.
 */
export function revisionHistory(pad, padLocator = null) {
  const doc = padForThread(pad, padLocator);
  const history = doc?.draftHistory ?? [];
  const entries = history.map((entry, i) => {
    const words = wordCount(entry.text);
    const wordDelta = i === 0 ? 0 : words - wordCount(history[i - 1].text);
    const kind = i === 0 ? "first" : entry.pass === "stream" ? "writing" : "reflect";
    const moves = (entry.contributions ?? []).map((c) => {
      const thread = threadFor(pad, c);
      return {
        kind: thread?.synthesis ? "synthesis" : "resolved",
        title: oneLine(thread?.steps?.[0]?.title || c.source || "Thread", 80),
        passage: oneLine(c.source, 80),
        result: oneLine(c.output),
        tag: c.tag ?? null,
        caveats: Array.isArray(c.caveats) ? c.caveats : [],
      };
    });
    return { n: entry.n ?? i, at: entry.at ?? null, kind, words, wordDelta, moves };
  });
  return entries.reverse();
}
