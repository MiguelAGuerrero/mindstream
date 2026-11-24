// ---------------------------------------------------------------------------
// Decompose handoff, Focus's side. Focus owns the translation in both
// directions: it turns the focus you are on into the neutral task other tools
// understand ({title, notes}), and it reads what comes back ({items, text}) as
// candidate sub-focuses. Pure: no Vue, no store, no imports from other tools.
// ---------------------------------------------------------------------------
import { cleanSteps } from "../../handoff/steps.js";

const MAX_NOTES = 280;

function oneLine(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * @param {{focus: string, breadcrumb?: string[]}} args
 *   focus: the current focus title; breadcrumb: root → current titles.
 * @returns {{title: string, notes?: string}|null} null when there is no focus text.
 */
export function focusToDecomposeTask({ focus, breadcrumb = [] } = {}) {
  const title = oneLine(focus);
  if (!title) return null;
  const task = { title };
  const chain = (Array.isArray(breadcrumb) ? breadcrumb : [])
    .slice(0, -1)
    .map(oneLine)
    .filter(Boolean)
    .join(" › ");
  if (chain) task.notes = chain.length > MAX_NOTES ? `${chain.slice(0, MAX_NOTES - 1).trimEnd()}…` : chain;
  return task;
}

// A leading list marker: "1." "2)" "-" "*" "•".
const LIST_MARKER = /^\s*(?:\d+[.)]|[-*•])\s+/;

/**
 * Steps typed as text: one per non-empty line, list markers optional.
 * @param {string} text
 * @returns {Array<{title: string}>}
 */
export function stepsFromText(text) {
  if (typeof text !== "string") return [];
  return cleanSteps(text.split(/\r?\n/).map((line) => oneLine(line.replace(LIST_MARKER, ""))));
}

/**
 * The steps a handoff result offers: its `items` (which may carry decisions),
 * or, when it only carries `text`, each non-empty line as a plain step.
 * @param {{output?: {items?: Array, text?: string}}|null} result
 * @returns {Array<{title: string, decision?: {options: string[]}}>}
 */
export function subFocusesFromResult(result) {
  const output = result?.output;
  if (!output) return [];
  if (Array.isArray(output.items)) return cleanSteps(output.items);
  return stepsFromText(output.text);
}
