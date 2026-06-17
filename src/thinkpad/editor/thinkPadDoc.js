// ---------------------------------------------------------------------------
// ThinkPad ↔ TipTap adapters (pure, DOM-free, node-testable).
//
// The domain model stores the think-pad body as a flat string (`thinkPad.text`)
// where `\n\n` separates paragraphs and `\n` is a soft break (HardBreak) within
// a paragraph. TipTap/ProseMirror works on a node tree addressed by positions.
//
// Each paragraph node carries a stable `id` attribute (via UniqueID extension).
// `docJSONToNodes` extracts these as [{ id, text }] — the groundwork for the
// node-based ideas map (paragraph = idea).
//
// charToPos / posToChar remain single-paragraph utilities: they map a local
// character offset within one paragraph to a ProseMirror position within that
// paragraph's content. Cross-paragraph addressing will use nodeId + localOffset
// once annotations are migrated to node-local coordinates.
// ---------------------------------------------------------------------------

/** Char offset within a paragraph → ProseMirror position (single paragraph). */
export function charToPos(charOffset) {
  const n = Number(charOffset);
  return (Number.isFinite(n) ? n : 0) + 1;
}

/** ProseMirror position → char offset (inverse of charToPos). */
export function posToChar(pos) {
  const n = Number(pos);
  return Math.max(0, (Number.isFinite(n) ? n : 1) - 1);
}

/** Serialize a list of inline ProseMirror nodes to a flat string. */
function serializeInline(nodes) {
  let out = "";
  for (const n of Array.isArray(nodes) ? nodes : []) {
    if (n?.type === "text") out += typeof n.text === "string" ? n.text : "";
    else if (n?.type === "hardBreak") out += "\n";
    else if (Array.isArray(n?.content)) out += serializeInline(n.content);
  }
  return out;
}

/**
 * Flat string → ProseMirror JSON doc.
 *
 * `\n\n` (blank line) → new paragraph node.
 * `\n` within a paragraph → HardBreak node (soft break).
 * Empty string → single empty paragraph.
 */
export function textToDocJSON(text) {
  const str = typeof text === "string" ? text : "";
  const paragraphs = str.split(/\n\n+/);
  const content = paragraphs.map((para) => {
    const inline = textToInlineJSON(para);
    return inline.length ? { type: "paragraph", content: inline } : { type: "paragraph" };
  });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/**
 * Inline content for a single paragraph — text split on `\n` with a HardBreak
 * between each line. Empty segments produce no illegal empty text nodes, so a
 * bare `\n` becomes a lone HardBreak and `""` yields []. Feed the result to
 * `insertContent` or embed in a paragraph node for `setContent`.
 */
export function textToInlineJSON(text) {
  const str = typeof text === "string" ? text : "";
  const parts = str.split("\n");
  const content = [];
  parts.forEach((part, i) => {
    if (i > 0) content.push({ type: "hardBreak" });
    if (part.length > 0) content.push({ type: "text", text: part });
  });
  return content;
}

/**
 * ProseMirror JSON doc → flat string.
 *
 * Paragraph nodes are joined with `\n\n`. HardBreak nodes within a paragraph
 * produce `\n`. Tolerant of unexpected nesting — recursive inline serializer
 * walks any content array it encounters.
 */
export function docJSONToText(json) {
  const blocks = Array.isArray(json?.content) ? json.content : [];
  return blocks.map((b) => serializeInline(b?.content)).join("\n\n");
}

/**
 * ProseMirror JSON doc → ordered node list for the ideas map.
 *
 * Each paragraph with a UniqueID `attrs.id` becomes `{ id, text }`. Paragraphs
 * without an id (e.g. not yet stamped) are omitted — UniqueID stamps them on
 * the next transaction, so this is a transient edge case.
 */
export function docJSONToNodes(json) {
  const blocks = Array.isArray(json?.content) ? json.content : [];
  return blocks
    .filter((b) => b?.type === "paragraph" && b?.attrs?.id != null)
    .map((b) => ({ id: b.attrs.id, text: serializeInline(b?.content) }));
}
