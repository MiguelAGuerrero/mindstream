// ---------------------------------------------------------------------------
// Focus's side of the message (roadmap §4.2). Focus owns the translation both
// ways: the focus you're on becomes `text` plus `context` (its ancestors,
// outermost first), and a reply's `steps` (or, failing that, the lines of its
// `text`) become candidate steps. Pure: no Vue, no store, no imports from other tools.
// ---------------------------------------------------------------------------
import { cleanSteps } from "../../handoff/steps.js";

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * The request body for asking about a focus.
 * @param {{focus: string, breadcrumb?: string[]}} args
 *   focus: the current focus title; breadcrumb: root → current titles.
 * @returns {{text: string, context: string[]}|null} null when there is no focus text.
 */
export function focusToRequest({ focus, breadcrumb = [] } = {}) {
  const text = oneLine(focus);
  if (!text) return null;
  const context = (Array.isArray(breadcrumb) ? breadcrumb : []).slice(0, -1).map(oneLine).filter(Boolean);
  return { text, context };
}

// A leading list marker: "1." "2)" "-" "*" "•".
const LIST_MARKER = /^\s*(?:\d+[.)]|[-*•])\s+/;

/**
 * Steps typed as text: one per non-empty line, list markers optional.
 * @param {string} text
 * @returns {Array<{prompt: string, produces: string}>}
 */
export function stepsFromText(text) {
  if (typeof text !== "string") return [];
  return cleanSteps(text.split(/\r?\n/).map((line) => oneLine(line.replace(LIST_MARKER, ""))));
}

/**
 * The steps a reply offers: its `steps` (which may carry calls), or, when it
 * only carries `text`, each non-empty line as a plain step.
 * @param {{steps?: Array, text?: string}|null} reply
 */
export function stepsFromReply(reply) {
  if (!reply) return [];
  if (Array.isArray(reply.steps) && reply.steps.length) return cleanSteps(reply.steps);
  return stepsFromText(reply.text);
}
