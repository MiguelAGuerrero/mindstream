// ---------------------------------------------------------------------------
// Move -> request body. ThinkPad owns this: it turns a drill thread (a "move")
// into the neutral message other tools understand (roadmap §4.2): `text` is
// the thread's goal, `context` the span it was drilled from. ThinkPad's own
// words (the move, the tag) never go on the wire.
// Pure: no Vue, no store, no imports from other tools.
// ---------------------------------------------------------------------------
const MAX_CONTEXT = 280;

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * @param {{thread: object, annotation?: object|null}} args
 *   thread: the drill thread (`steps[0].title`); annotation: the parent
 *   annotation it was drilled from (`selectedText`).
 * @returns {{text: string, context: string[]}|null}
 */
export function moveToRequest({ thread, annotation } = {}) {
  const selected = oneLine(annotation?.selectedText);
  const text = oneLine(thread?.steps?.[0]?.title) || selected;
  if (!text) return null;
  const context = [];
  if (selected && selected !== text) {
    context.push(selected.length > MAX_CONTEXT ? `${selected.slice(0, MAX_CONTEXT - 1).trimEnd()}…` : selected);
  }
  return { text, context };
}
