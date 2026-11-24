// ---------------------------------------------------------------------------
// Decompose return, ThinkPad's side. When another tool asks ThinkPad to
// decompose something, the answer is a short ordered list. This turns what the
// user wrote on the pad into that list. Pure: no Vue, no store, no imports from
// other tools.
// ---------------------------------------------------------------------------
const MAX_ITEMS = 12;

// A leading list marker: "1." "2)" "-" "*" "•".
const MARKER = /^\s*(?:\d+[.)]|[-*•])\s+/;

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * Suggest steps from pad text: only the lines that look like list items, so a
 * prose paragraph is never mistaken for a step.
 * @param {string} text
 * @returns {string[]}
 */
export function itemsFromPadText(text) {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .filter((line) => MARKER.test(line))
    .map((line) => oneLine(line.replace(MARKER, "")))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

/**
 * The steps in an editable draft: one per non-empty line, list markers optional.
 * @param {string} draft
 * @returns {string[]}
 */
export function itemsFromDraft(draft) {
  if (typeof draft !== "string") return [];
  return draft
    .split(/\r?\n/)
    .map((line) => oneLine(line.replace(MARKER, "")))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}
