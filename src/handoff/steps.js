// ---------------------------------------------------------------------------
// Step — the shared unit every tool exchanges when it supplies or runs steps
// (a workflow's template, ThinkPad's decomposition, Focus's plan).
//
//   { title, decision? }
//   decision: { options: string[] }   the step finishes by choosing an output.
//             options empty          → the output is a short free answer.
//
// A plain string is accepted anywhere a step is, and read as { title }.
// Pure data: no Vue, no store. Tools import this; never each other.
// ---------------------------------------------------------------------------
export const MAX_STEPS = 12;
export const MAX_OPTIONS = 6;
const MAX_TITLE = 200;
const MAX_OPTION = 80;

function oneLine(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A canonical decision, or null when the input does not mark one. */
export function cleanDecision(decision) {
  if (!decision || typeof decision !== "object") return null;
  const seen = new Set();
  const options = (Array.isArray(decision.options) ? decision.options : [])
    .map((o) => oneLine(o, MAX_OPTION))
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()))
    .slice(0, MAX_OPTIONS);
  return { options };
}

/** A canonical step, or null without a usable title. */
export function cleanStep(step) {
  const raw = typeof step === "string" ? { title: step } : step;
  if (!raw || typeof raw !== "object") return null;
  const title = oneLine(raw.title, MAX_TITLE);
  if (!title) return null;
  const decision = cleanDecision(raw.decision);
  return decision ? { title, decision } : { title };
}

/** An ordered list of canonical steps: unusable entries dropped, capped. */
export function cleanSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map(cleanStep).filter(Boolean).slice(0, MAX_STEPS);
}

/** True when finishing this step means choosing an output. */
export function isDecision(step) {
  return !!step?.decision;
}
