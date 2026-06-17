/**
 * Stable id derived from block content via a djb2 hash.
 * Deterministic: same frozen text always produces the same block id.
 * Prefixed "b" so the result is never a bare number.
 */
function blockId(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return "b" + (h >>> 0).toString(36);
}

/**
 * Splits a flat document string into block-level spans.
 *
 * A block is any run of text not interrupted by a blank line (\n\n).
 * Single \n inside a block are preserved (they are soft / hard-breaks
 * within the same idea). Whitespace-only blocks are discarded.
 *
 * Returns an array of { id, start, end, text } where:
 *   id    — stable content-hash address (primary key for move attachment)
 *   start/end — character offsets into the original string, kept for
 *               backward compat with the annotation selectionStart/selectionEnd space.
 */
export function parseBlocks(text) {
  if (typeof text !== "string" || text.length === 0) return [];

  const blocks = [];
  let pos = 0;

  while (pos < text.length) {
    // skip leading newlines between blocks
    while (pos < text.length && text[pos] === "\n") pos++;
    if (pos >= text.length) break;

    const start = pos;
    let end = pos;

    // advance until \n\n (blank line) or end of string
    while (end < text.length) {
      if (text[end] === "\n" && text[end + 1] === "\n") break;
      end++;
    }

    const blockText = text.slice(start, end);
    if (blockText.trim().length > 0) {
      blocks.push({ id: blockId(blockText), start, end, text: blockText });
    }

    pos = end;
  }

  return blocks;
}
