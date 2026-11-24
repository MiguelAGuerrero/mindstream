// ---------------------------------------------------------------------------
// Tool registry — the one list of tools the shell knows about. The launcher
// and every "send this to another tool" action read it, so a new tool plugs in
// by adding an entry here. Pure data: no Vue, no router instance.
//
// `accepts` declares which handoff intents a tool can receive, and the task
// fields each intent needs. A tool with `accepts: []` is source-only.
// ---------------------------------------------------------------------------

/** Query param that carries a handoff id (and nothing else) to the target route. */
export const HANDOFF_QUERY_PARAM = "handoff";

/** The asks tools can make of each other. Add one only when a real interaction needs it. */
export const INTENTS = Object.freeze({
  START_SESSION: "start-session", // run this as a timed focus
  DECOMPOSE: "decompose", // think this through and hand back sub-steps
  PICK_STEPS: "pick-steps", // let the user choose saved steps and hand them back
  SAVE_STEPS: "save-steps", // keep these steps as a reusable template
});

export const TOOLS = Object.freeze([
  Object.freeze({
    id: "thinkpad",
    name: "ThinkPad",
    job: "Think a problem through, one move at a time.",
    route: Object.freeze({ name: "thinkpad" }),
    icon: "mdi-notebook",
    accepts: Object.freeze([Object.freeze({ intent: INTENTS.DECOMPOSE, requires: Object.freeze(["title"]) })]),
  }),
  Object.freeze({
    id: "focus",
    name: "Focus",
    job: "Work on one thing with a timer and nothing else.",
    route: Object.freeze({ name: "focus" }),
    icon: "mdi-timer",
    accepts: Object.freeze([Object.freeze({ intent: INTENTS.START_SESSION, requires: Object.freeze(["title"]) })]),
  }),
  Object.freeze({
    id: "workflows",
    name: "Workflows",
    job: "Save steps as templates and reuse them to decompose a focus or start a routine.",
    route: Object.freeze({ name: "workflows" }),
    icon: "mdi-format-list-numbered",
    accepts: Object.freeze([
      Object.freeze({ intent: INTENTS.PICK_STEPS, requires: Object.freeze(["title"]) }),
      Object.freeze({ intent: INTENTS.SAVE_STEPS, requires: Object.freeze(["title"]) }),
    ]),
  }),
]);

export function getTool(id) {
  return TOOLS.find((t) => t.id === id) ?? null;
}

/** The accepts entry for `intent`, or null. */
export function getAcceptedIntent(toolId, intent) {
  return getTool(toolId)?.accepts.find((a) => a.intent === intent) ?? null;
}

export function acceptsIntent(toolId, intent) {
  return getAcceptedIntent(toolId, intent) != null;
}

/** Tools that can receive `intent`. */
export function toolsAccepting(intent) {
  return TOOLS.filter((t) => acceptsIntent(t.id, intent));
}

/** vue-router location for a tool, optionally with a query. Null for unknown tools. */
export function routeForTool(id, query) {
  const tool = getTool(id);
  if (!tool) return null;
  const location = { ...tool.route };
  if (query && Object.keys(query).length) location.query = { ...query };
  return location;
}
