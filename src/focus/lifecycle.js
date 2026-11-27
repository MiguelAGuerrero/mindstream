// What a person can start in the Focus runner, and what ends each thing.
// See src/thinkpad/lifecycle.js and CLAUDE.md.
export default {
  store: "sessionRun",
  starts: [
    { what: "a context", start: ["newContext"], ends: ["resolveFocus", "endActiveContext"] },
    { what: "a decomposed focus", start: ["drillIntoFocus", "startStep", "jumpToStep"], ends: ["resolveFocus", "abandonFocus", "decideStep"] },
    { what: "a plan of steps", start: ["planSteps"], ends: ["discardPlan", "resolveFocus"] },
    { what: "a parked context", start: ["parkActiveContext"], ends: ["switchContext", "endActiveContext"] },
    { what: "a waiting-on reason", start: ["setWaitingOn", "parkActiveContext"], ends: ["clearWaitingOn"] },
    { what: "waiting on another tool for steps", start: ["setAwaitingHandoff"], ends: ["setAwaitingHandoff"] },
    { what: "being on a context", start: ["switchContext"], ends: ["deactivate", "parkActiveContext"] },
  ],
  other: ["loadContexts", "addSpentSeconds", "reflectOnFocus"],
};
