// Pure projection: per-idea action state for the ThinkPad block widget.
// No ProseMirror / DOM knowledge — the extension layer handles rendering.
//
// Ideas are first-class on doc.ideas; this module projects them for the UI
// rather than re-parsing flat text or editor nodes.

import { ideaRanges } from "./ideas";

/**
 * For each non-empty idea, derive its block action state.
 *
 * @param {Array<{id: string, text: string}>} ideas — doc.ideas
 * @param {Array} annotations
 * @param {Array} drillThreads
 * @returns {Array<{nodeId, text, start, end, drill}>}
 */
export function computeBlockActionStates(ideas, annotations, drillThreads) {
  const ranges = ideaRanges(ideas);
  const drillByAnnotationId = new Map((drillThreads ?? []).map((d) => [d.annotationId, d]));
  const anns = (annotations ?? []).filter((a) => a.hidden !== true);

  return ranges.map(({ id: nodeId, text, start, end }) => {
    const drill =
      anns
        .filter((a) => {
          const iid = a.ideaId ?? a.blockId;
          return iid === nodeId || (a.selectionStart >= start && a.selectionEnd <= end);
        })
        .map((a) => drillByAnnotationId.get(a.id))
        .find(Boolean) ?? null;
    return { nodeId, text, start, end, drill };
  });
}

/**
 * Map staged outputs onto ideas by ideaId (first-class — no offset calculation).
 *
 * @param {Array<{id: string, text: string}>} ideas
 * @param {Array<{ id, stepId, ideaId?, blockId?, annotationId?, moveId?, text?, source? }>} stagedIdeas
 * @returns {Array<{ nodeId, start, end, ideas }>}
 */
export function computeBlockIdeaStates(ideas, stagedIdeas) {
  const ranges = ideaRanges(ideas);
  const rangeById = new Map(ranges.map((r) => [r.id, r]));
  const byIdea = new Map();

  for (const staged of stagedIdeas ?? []) {
    const ideaId = staged.ideaId ?? staged.blockId;
    if (typeof ideaId !== "string" || !ideaId) continue;
    const list = byIdea.get(ideaId) ?? [];
    list.push(staged);
    byIdea.set(ideaId, list);
  }

  return [...byIdea.entries()]
    .map(([ideaId, stagedList]) => {
      const range = rangeById.get(ideaId);
      if (!range) return null;
      return { nodeId: ideaId, start: range.start, end: range.end, ideas: stagedList };
    })
    .filter(Boolean);
}

/**
 * One gutter row per idea/block — staged outputs attached when present.
 *
 * @param {Array<{id: string, text: string}>} ideas
 * @param {Array<{ id, stepId, ideaId?, blockId?, annotationId?, moveId?, text?, source? }>} stagedIdeas
 * @returns {Array<{ nodeId, start, end, ideas }>}
 */
export function computeGutterRows(ideas, stagedIdeas) {
  const ranges = ideaRanges(ideas);
  const stagedByNode = new Map(
    computeBlockIdeaStates(ideas, stagedIdeas).map((row) => [row.nodeId, row.ideas]),
  );

  return ranges.map(({ id: nodeId, start, end }) => ({
    nodeId,
    start,
    end,
    ideas: stagedByNode.get(nodeId) ?? [],
  }));
}

/** @deprecated Use ideaRanges from ideas — kept for tests migrating off node offsets. */
export function computeNodeRanges(nodes) {
  let offset = 0;
  return (nodes ?? []).map(({ id, text }) => {
    const start = offset;
    const end = start + (typeof text === "string" ? text.length : 0);
    offset = end + 2;
    return { id, text: text ?? "", start, end };
  });
}
