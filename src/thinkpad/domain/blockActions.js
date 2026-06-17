// Pure projection: per-block action state for the ThinkPad block widget.
// No ProseMirror / DOM knowledge — the extension layer handles rendering.
//
// "Block" = one paragraph node (identified by its UniqueID). Each block
// exposes whether it already has a drill thread anchored within it so the
// widget can render a re-open affordance instead of tag-selection buttons.
//
// docJSONToText joins paragraphs with "\n\n", so the char start of node N is:
//   sum(nodes[0..N-1].text.length + 2) for the two-char separator.
// This matches the offsets stored on annotations (selectionStart/selectionEnd).

/** Compute the flat-text char range [start, end) for each ordered node. */
export function computeNodeRanges(nodes) {
  let offset = 0;
  return (nodes ?? []).map(({ id, text }) => {
    const start = offset;
    const end = start + (typeof text === "string" ? text.length : 0);
    offset = end + 2; // "\n\n" paragraph separator in docJSONToText
    return { id, text: text ?? "", start, end };
  });
}

/**
 * For each non-empty document paragraph, derive its block action state.
 *
 * @param {Array<{id: string, text: string}>} nodes — ordered paragraph nodes
 *   from docJSONToNodes (UniqueID-stamped paragraphs only).
 * @param {Array} annotations — pad doc annotations (thinkPad.annotations).
 *   Hidden markers are excluded — they carry no actionable intent.
 * @param {Array} drillThreads — drill thread descriptors from the view layer:
 *   [{ annotationId, threadId, tag, title, hasWork, completed }].
 *
 * @returns {Array<{nodeId, text, start, end, drill}>}
 *   drill is the matching drillThreads entry (full object) or null.
 */
export function computeBlockActionStates(nodes, annotations, drillThreads) {
  const ranges = computeNodeRanges(nodes);
  const drillByAnnotationId = new Map((drillThreads ?? []).map((d) => [d.annotationId, d]));
  const anns = (annotations ?? []).filter((a) => a.hidden !== true);

  return ranges
    .filter(({ text }) => text.trim() !== "")
    .map(({ id: nodeId, text, start, end }) => {
      // An annotation "belongs to" a block when its entire char range is
      // contained within the block's range. Cross-block annotations are
      // left unmatched (they are rare and would be misleading to assign).
      const drill =
        anns
          .filter((a) => a.selectionStart >= start && a.selectionEnd <= end)
          .map((a) => drillByAnnotationId.get(a.id))
          .find(Boolean) ?? null;
      return { nodeId, text, start, end, drill };
    });
}
