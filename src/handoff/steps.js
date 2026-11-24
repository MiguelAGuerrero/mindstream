// ---------------------------------------------------------------------------
// Step — one prompt in an ordered list of prompts, the shape every tool
// exchanges (roadmap §4.2; capture-templates-proposal §3.1, §9).
//
//   { prompt, produces, expects?, options? }
//   produces: "text" | "action"   what doing the step yields (default "text").
//                                 ThinkPad takes a list only if every step
//                                 produces text; the runner takes any.
//   expects:  "call"              the step resolves to a decision (§7 "Call").
//   options:  string[]            for a call, the outputs to choose from.
//                                 Empty or absent → a short free answer.
//
// A tool that doesn't know `expects` / `options` still reads the step as a
// plain prompt, so the list always renders as numbered text.
//
// Read leniently: a bare string is { prompt }, and the earlier shape
// { title, decision: { options } } is read as { prompt, expects: "call", options }.
// Pure data: no Vue, no store. Tools import this; never each other.
// ---------------------------------------------------------------------------
export const MAX_STEPS = 12;
export const MAX_OPTIONS = 6;
export const PRODUCES = Object.freeze(["text", "action"]);
const MAX_PROMPT = 200;
const MAX_OPTION = 80;

function oneLine(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Clean, de-duplicated (case-insensitive) options, capped. */
export function cleanOptions(options) {
  const seen = new Set();
  return (Array.isArray(options) ? options : [])
    .map((o) => oneLine(o, MAX_OPTION))
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()))
    .slice(0, MAX_OPTIONS);
}

/** A canonical step, or null without a usable prompt. */
export function cleanStep(step) {
  const raw = typeof step === "string" ? { prompt: step } : step;
  if (!raw || typeof raw !== "object") return null;
  const prompt = oneLine(raw.prompt ?? raw.title, MAX_PROMPT);
  if (!prompt) return null;
  const out = { prompt, produces: raw.produces === "action" ? "action" : "text" };
  const legacyDecision = raw.decision && typeof raw.decision === "object" ? raw.decision : null;
  if (raw.expects === "call" || legacyDecision) {
    out.expects = "call";
    const options = cleanOptions(raw.options ?? legacyDecision?.options);
    if (options.length) out.options = options;
  }
  return out;
}

/** An ordered list of canonical steps: unusable entries dropped, capped. */
export function cleanSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map(cleanStep).filter(Boolean).slice(0, MAX_STEPS);
}

/** True when finishing this step means making a call (choosing an output). */
export function isDecision(step) {
  return step?.expects === "call";
}

/** The outputs a decision step offers ([] = a free answer). */
export function stepOptions(step) {
  return isDecision(step) && Array.isArray(step.options) ? step.options : [];
}

/** True when every step produces text (what ThinkPad can take). */
export function allProduceText(steps) {
  return Array.isArray(steps) && steps.every((s) => s?.produces !== "action");
}
