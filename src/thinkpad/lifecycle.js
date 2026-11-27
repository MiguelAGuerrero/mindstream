// What a person can start in ThinkPad, and what ends each thing.
// Every action of the pad store is classified here; a new action that is not
// fails src/lifecycle.contract.test.js until it is. See CLAUDE.md.
export default {
  store: "pad",
  starts: [
    { what: "a pad", start: ["createNewPad", "newPad", "newBlankPad", "ensureBlankPad"], ends: ["deletePad", "clearAll"] },
    { what: "Reflect (a frozen draft)", start: ["enterReflect", "stampDraft"], ends: ["leaveReflect", "advanceToNextDraft"] },
    { what: "reading an earlier draft", start: ["navigateToDraft"], ends: ["exitDraftHistory"] },
    { what: "a thread on a passage", start: ["drillIntoSpan", "promoteWithinPad"], ends: ["resolveThreadIntoParent", "answerMove", "setAsideThread", "removeMove", "ascendThread"] },
    { what: "a synthesis over the draft", start: ["startSynthesis"], ends: ["resolveThreadIntoParent", "setAsideThread", "ascendThread"] },
    { what: "being inside a thread", start: ["pushSurface", "navigateToThread"], ends: ["ascendThread", "jumpToSurfaceIndex", "navigateToThread"] },
    { what: "a thread set aside", start: ["setAsideThread"], ends: ["bringBackThread"] },
    { what: "a decision on an open item", start: ["disposeOpenItem"], ends: ["clearDisposition"] },
    { what: "a needs-a-source mark", start: ["markNeedsSource"], ends: ["removeNeedsSource", "addLink", "addPassageLink", "disposeOpenItem"] },
    { what: "a link on a passage", start: ["addLink", "addPassageLink"], ends: ["removeLink"] },
    { what: "a tag on a passage", start: ["tagAnnotation"], ends: ["tagAnnotation"] },
    { what: "a hidden passage", start: ["hideSpanInPad"], ends: ["revealHiddenInPad"] },
    { what: "a thread waiting for workflow steps", start: ["addPendingSlot"], ends: ["settleSlot"] },
    { what: "a tag's shortcut", start: ["declareTagShortcut"], ends: ["clearTagShortcut", "declareTagShortcut"] },
    { what: "a result waiting for the next draft", start: ["answerMove", "resolveThreadIntoParent"], ends: ["advanceToNextDraft", "leaveReflect", "keepStagedOutput"] },
  ],
  // Actions that start nothing: loading, choosing what is on screen, editing text in place.
  other: [
    "loadPads", "setActivePad", "activatePad", "persistCurrent", "dismissStudyBeat",
    "setPadText", "setCurrentPadTitle", "setThreadGoal", "reorderBlock", "quoteInto", "applyTagShortcut",
    // Read-only lookups (getters that take an argument).
    "openItemsAt", "decidedItemsAt", "openCountAt",
  ],
};
