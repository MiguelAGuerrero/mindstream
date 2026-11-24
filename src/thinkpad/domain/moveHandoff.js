// ---------------------------------------------------------------------------
// Move -> task conversion. ThinkPad owns this: it turns a drill thread (a
// "move") into the minimal neutral task other tools understand, {title, notes}.
// The move has no duration of its own, so no suggestedMinutes is produced.
// Pure: no Vue, no store, no imports from other tools.
// ---------------------------------------------------------------------------
const MAX_NOTES = 280;

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * @param {{thread: object, annotation?: object|null}} args
 *   thread: the drill thread (`steps[0].title`); annotation: the parent
 *   annotation it was drilled from (`selectedText`).
 * @returns {{title: string, notes?: string}|null}
 */
export function moveToFocusTask({ thread, annotation } = {}) {
  const selected = oneLine(annotation?.selectedText);
  const title = oneLine(thread?.steps?.[0]?.title) || selected;
  if (!title) return null;
  const task = { title };
  if (selected && selected !== title) {
    task.notes = selected.length > MAX_NOTES ? `${selected.slice(0, MAX_NOTES - 1).trimEnd()}…` : selected;
  }
  return task;
}
