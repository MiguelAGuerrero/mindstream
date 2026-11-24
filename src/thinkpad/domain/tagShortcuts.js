// ---------------------------------------------------------------------------
// Tag shortcuts (roadmap Revision 29: "a shortcut declared per tag").
// Each tag (question / expand / converge) may have one workflow as its
// shortcut. ThinkPad keeps its own copy, a label and the steps as content, so
// it never reads the library; a newer declaration replaces the older one.
// A shortcut is offered on a tagged thread and never applied by tagging alone
// (decision 22).
// ---------------------------------------------------------------------------
import { ANNOTATION_TAG_LIST } from "../moves";

function cleanSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => ({
      prompt: String(s?.prompt ?? "").trim(),
      produces: s?.produces === "action" ? "action" : "text",
      ...(s?.expects === "call" ? { expects: "call", options: Array.isArray(s.options) ? s.options.map(String) : [] } : {}),
    }))
    .filter((s) => s.prompt);
}

export function normalizeTagShortcuts(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const tag of ANNOTATION_TAG_LIST) {
    const entry = raw[tag];
    const label = typeof entry?.label === "string" ? entry.label.trim() : "";
    const steps = cleanSteps(entry?.steps);
    if (label && steps.length) out[tag] = { label, steps };
  }
  return out;
}

/** Declare (or replace) the shortcut for a tag. Same ref when nothing changes or the input is unusable. */
export function setTagShortcut(map, tag, { label, steps } = {}) {
  const current = map ?? {};
  if (!ANNOTATION_TAG_LIST.includes(tag)) return current;
  const next = normalizeTagShortcuts({ [tag]: { label, steps } })[tag];
  if (!next) return current;
  if (JSON.stringify(current[tag]) === JSON.stringify(next)) return current;
  return { ...current, [tag]: next };
}

/** Remove a tag's shortcut. Same ref when there is none. */
export function clearTagShortcut(map, tag) {
  const current = map ?? {};
  if (!current[tag]) return current;
  const { [tag]: _drop, ...rest } = current;
  return rest;
}
