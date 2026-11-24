// ---------------------------------------------------------------------------
// Tool registry — the one list of tools the shell knows about (roadmap §4.3).
// The launcher reads it, and the broker matches requests against it, so a new
// tool plugs in by adding an entry here. Pure data: no Vue, no router instance.
//
// A tool registers what it RECEIVES (roadmap §4.2, "the broker is a dumb pipe"):
//   wants: the neutral verbs it serves, from the shell's short list (WANTS).
//   steps: whether it takes a request carrying `steps`:
//          "any"  any steps; "text" only if every step produces text; "none".
// A tool with no wants is source-only. Tools never name each other: a sender
// asks for a verb and the broker finds who serves it.
// ---------------------------------------------------------------------------
import { allProduceText } from "./steps.js";

/** Query param that carries a handoff id (and nothing else) to the target route. */
export const HANDOFF_QUERY_PARAM = "handoff";

/**
 * The shell's short list of neutral verbs. Tool words (ThinkPad's moves and
 * tags) never go on the wire. Add one only when a real interaction needs it.
 */
export const WANTS = Object.freeze({
  STEP_THROUGH: "step-through", // work through this (and its steps, if any), one at a time
  THINK: "think", //               think this through and send back what came of it
  CHOOSE_STEPS: "choose-steps", // let the user choose saved steps and send them back
  KEEP: "keep", //                 keep these steps as a reusable workflow
});

export const TOOLS = Object.freeze([
  Object.freeze({
    id: "thinkpad",
    name: "ThinkPad",
    job: "Think a problem through, one move at a time.",
    route: Object.freeze({ name: "thinkpad" }),
    icon: "mdi-notebook",
    receives: Object.freeze({ wants: Object.freeze([WANTS.THINK]), steps: "none" }),
  }),
  Object.freeze({
    id: "focus",
    name: "Focus",
    job: "Work on one thing with a timer and nothing else.",
    route: Object.freeze({ name: "focus" }),
    icon: "mdi-timer",
    receives: Object.freeze({ wants: Object.freeze([WANTS.STEP_THROUGH]), steps: "any" }),
  }),
  Object.freeze({
    id: "workflows",
    name: "Workflows",
    job: "Save steps as workflows and reuse them to decompose a focus or start a routine.",
    route: Object.freeze({ name: "workflows" }),
    icon: "mdi-format-list-numbered",
    receives: Object.freeze({ wants: Object.freeze([WANTS.CHOOSE_STEPS, WANTS.KEEP]), steps: "any" }),
  }),
]);

export function getTool(id) {
  return TOOLS.find((t) => t.id === id) ?? null;
}

/** Whether `toolId` serves `want` and can take `steps` (optional). */
export function serves(toolId, want, steps = []) {
  const tool = getTool(toolId);
  if (!tool || !tool.receives.wants.includes(want)) return false;
  if (!Array.isArray(steps) || !steps.length) return true;
  if (tool.receives.steps === "any") return true;
  if (tool.receives.steps === "text") return allProduceText(steps);
  return false;
}

/**
 * Tools that can take a request for `want` (with these `steps`). When more than
 * one fits, the shell should let the user pick; today no verb has two.
 */
export function toolsFor(want, steps = []) {
  return TOOLS.filter((t) => serves(t.id, want, steps));
}

/** vue-router location for a tool, optionally with a query. Null for unknown tools. */
export function routeForTool(id, query) {
  const tool = getTool(id);
  if (!tool) return null;
  const location = { ...tool.route };
  if (query && Object.keys(query).length) location.query = { ...query };
  return location;
}
