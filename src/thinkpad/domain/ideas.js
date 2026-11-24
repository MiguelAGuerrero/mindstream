// ---------------------------------------------------------------------------
// Ideas — first-class paragraph units on a doc surface.
//
// A block IS an idea: one stable id, one body of text. doc.ideas is the source
// of truth; doc.text is a derived cache (ideas joined with \n\n) for the editor
// and legacy offset-based annotations. parseIdeasFromText is a read-only
// projection for migration and tests — not the runtime model.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, text: string }} Idea
 */

/** Join non-empty ideas into the flat doc string the editor consumes. */
export function ideasToText(ideas) {
  return (ideas ?? [])
    .map((i) => (typeof i.text === "string" ? i.text : ""))
    .filter((t) => t.trim().length > 0)
    .join("\n\n");
}

/** @deprecated Use ideasToText — blocks are ideas. */
export const blocksToText = ideasToText;

/** Split flat text into idea bodies (blank-line separated), skipping empties. */
export function splitTextIntoBodies(text) {
  if (typeof text !== "string" || !text.length) return [];
  const bodies = [];
  let pos = 0;
  while (pos < text.length) {
    while (pos < text.length && text[pos] === "\n") pos++;
    if (pos >= text.length) break;
    const start = pos;
    while (pos < text.length && !(text[pos] === "\n" && text[pos + 1] === "\n")) pos++;
    const body = text.slice(start, pos);
    if (body.trim().length > 0) bodies.push(body);
  }
  return bodies;
}

/**
 * Legacy content-hash id for text-only projections (migration / tests).
 * Persisted ideas use editor- or makeId-minted ids instead.
 */
function contentHashId(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return "b" + (h >>> 0).toString(36);
}

/**
 * Parse flat text into idea spans with character offsets.
 * Read-only projection — prefer doc.ideas at runtime.
 */
export function parseIdeasFromText(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const ideas = [];
  let pos = 0;
  while (pos < text.length) {
    while (pos < text.length && text[pos] === "\n") pos++;
    if (pos >= text.length) break;
    const start = pos;
    while (pos < text.length && !(text[pos] === "\n" && text[pos + 1] === "\n")) pos++;
    const body = text.slice(start, pos);
    if (body.trim().length > 0) {
      ideas.push({ id: contentHashId(body), start, end: pos, text: body });
    }
  }
  return ideas;
}

/** @deprecated Use parseIdeasFromText — blocks are ideas. */
export const parseBlocks = parseIdeasFromText;

/** Mint idea ids for a flat string (migration / text-only edits). */
export function ideasFromText(text, { makeId } = {}) {
  const mint = typeof makeId === "function" ? makeId : () => `idea:${Math.random().toString(36).slice(2)}`;
  return splitTextIntoBodies(text).map((body) => ({
    id: mint("idea"),
    text: body,
  }));
}

/** @deprecated Use ideasFromText. */
export const blocksFromText = ideasFromText;

/** Sync doc.ideas from editor paragraph nodes (UniqueID). */
export function syncIdeasFromNodes(existingIdeas, nodes, { makeId } = {}) {
  const mint = typeof makeId === "function" ? makeId : () => `idea:${Math.random().toString(36).slice(2)}`;
  const byId = new Map((existingIdeas ?? []).map((i) => [i.id, i]));
  return (nodes ?? []).map((node) => {
    const id = (typeof node?.id === "string" && node.id) ? node.id : mint("idea");
    const text = typeof node?.text === "string" ? node.text : "";
    return byId.has(id) ? { ...byId.get(id), text } : { id, text };
  });
}

/** @deprecated Use syncIdeasFromNodes. */
export const syncBlocksFromNodes = syncIdeasFromNodes;

/** Preserve idea ids when only the flat text changed (tests, programmatic edits). */
export function reconcileIdeasFromText(existingIdeas, text, { makeId } = {}) {
  const bodies = splitTextIntoBodies(text);
  if (!bodies.length) return [];
  const prior = existingIdeas ?? [];
  return bodies.map((body, i) => {
    if (i < prior.length) return { ...prior[i], text: body };
    return { id: (typeof makeId === "function" ? makeId("idea") : `idea:${i}`), text: body };
  });
}

/** @deprecated Use reconcileIdeasFromText. */
export const reconcileBlocksFromText = reconcileIdeasFromText;

function normalizeIdeaRecord(value) {
  if (!value || typeof value !== "object") return null;
  const id = typeof value.id === "string" && value.id ? value.id : null;
  if (!id) return null;
  return { id, text: typeof value.text === "string" ? value.text : "" };
}

/** Read persisted ideas from a doc, including legacy `blocks` field. */
export function readDocIdeas(doc) {
  if (!doc || typeof doc !== "object") return [];
  if (Array.isArray(doc.ideas) && doc.ideas.length > 0) {
    return doc.ideas.map(normalizeIdeaRecord).filter(Boolean);
  }
  if (Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    return doc.blocks.map(normalizeIdeaRecord).filter(Boolean);
  }
  return [];
}

/** Frozen snapshot ideas for cultivate mode, with legacy field fallback. */
export function readFrozenIdeas(doc) {
  if (!doc || typeof doc !== "object") return [];
  if (Array.isArray(doc.frozenIdeas) && doc.frozenIdeas.length > 0) {
    return doc.frozenIdeas.map(normalizeIdeaRecord).filter(Boolean);
  }
  if (Array.isArray(doc.frozenBlocks) && doc.frozenBlocks.length > 0) {
    return doc.frozenBlocks.map(normalizeIdeaRecord).filter(Boolean);
  }
  return readDocIdeas(doc);
}

/** Ensure doc.ideas exists; back-fill from legacy blocks or flat text. */
export function ensureDocIdeas(doc, { makeId } = {}) {
  if (!doc || typeof doc !== "object") return { ideas: [], text: "" };
  const legacy = Array.isArray(doc.blocks) ? doc.blocks : [];
  const ideas = Array.isArray(doc.ideas) && doc.ideas.length > 0
    ? doc.ideas.map(normalizeIdeaRecord).filter(Boolean)
    : legacy.map(normalizeIdeaRecord).filter(Boolean);
  if (ideas.length > 0) {
    return { ...doc, ideas, text: ideasToText(ideas) };
  }
  const text = typeof doc.text === "string" ? doc.text : "";
  if (!text.trim()) return { ...doc, ideas: [], text: "" };
  const minted = ideasFromText(text, { makeId });
  return { ...doc, ideas: minted, text: ideasToText(minted) };
}

/** @deprecated Use ensureDocIdeas. */
export const ensureDocBlocks = ensureDocIdeas;

/**
 * Character ranges for each idea — backward compat for annotation offsets.
 * Returns { id, text, start, end }[] aligned with docJSONToText separators.
 */
export function ideaRanges(ideas) {
  let offset = 0;
  return (ideas ?? [])
    .filter((i) => (i.text ?? "").trim().length > 0)
    .map((i) => {
      const text = i.text ?? "";
      const start = offset;
      const end = start + text.length;
      offset = end + 2;
      return { id: i.id, text, start, end };
    });
}

/** @deprecated Use ideaRanges. */
export const blockRanges = ideaRanges;

/** Resolve which idea owns a character range (prefer containment, then overlap). */
export function ideaIdForRange(ideas, selectionStart, selectionEnd) {
  if (typeof selectionStart !== "number" || typeof selectionEnd !== "number") return null;
  const ranges = ideaRanges(ideas);
  const contained = ranges.find((r) => selectionStart >= r.start && selectionEnd <= r.end);
  if (contained) return contained.id;
  const overlapping = ranges.find((r) => selectionStart < r.end && selectionEnd > r.start);
  return overlapping?.id ?? null;
}

/** @deprecated Use ideaIdForRange. */
export const blockIdForRange = ideaIdForRange;

/** Remap annotation offsets after ideas were reordered (ids preserved). */
export function remapAnnotationsForIdeaReorder(annotations, oldIdeas, newIdeas) {
  const oldRanges = ideaRanges(oldIdeas);
  const newRangeById = new Map(ideaRanges(newIdeas).map((r) => [r.id, r]));
  return (annotations ?? []).map((ann) => {
    const iid = ann.ideaId ?? ann.blockId ?? ideaIdForRange(oldIdeas, ann.selectionStart, ann.selectionEnd);
    if (!iid) return ann;
    const oldR = oldRanges.find((r) => r.id === iid);
    const newR = newRangeById.get(iid);
    if (!oldR || !newR) return ann;
    const relStart = ann.selectionStart - oldR.start;
    const relEnd = ann.selectionEnd - oldR.start;
    return {
      ...ann,
      ideaId: iid,
      selectionStart: newR.start + relStart,
      selectionEnd: newR.start + relEnd,
    };
  });
}

/** @deprecated Use remapAnnotationsForIdeaReorder. */
export const remapAnnotationsForBlockReorder = remapAnnotationsForIdeaReorder;

/** True when more than one non-empty idea exists (open thread / needs synthesis). */
export function docHasMultipleIdeas(doc) {
  const ideas = doc?.ideas ?? doc?.blocks;
  if (Array.isArray(ideas)) {
    return ideas.filter((i) => (i.text ?? "").trim().length > 0).length > 1;
  }
  return splitTextIntoBodies(doc?.text ?? "").length > 1;
}

/** @deprecated Use docHasMultipleIdeas. */
export const docHasMultipleBlocks = docHasMultipleIdeas;
