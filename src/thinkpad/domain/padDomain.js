// ---------------------------------------------------------------------------
// Pad domain — facade re-exporting the ThinkPad model API.
//
// A Pad is one independent document surface the user can resume. It owns:
//   - title, threads, config, state, timestamps, resumeHint
// All structural and step-level state lives directly on the entities; there
// is no separate event log. See `thinkPadModel.js` for the model.
// ---------------------------------------------------------------------------

export {
  // Constructors
  createPad,
  createStep,
  createThread,
  // Projections
  findStepDeep,
  findStepInThread,
  threadIsOpen,
  // Thread creation
  addRootThread,
  // Pad-level
  setResumeHint,
  setTitle,
  setThinkPadText,
  addThinkPadAnnotation,
  updateThinkPadAnnotation,
  tagPadAnnotation,
  promoteSpanToMove,
  captureIdea,
  performMoveOnIdea,
  setStepOutput,
  setStepTitleById,
  resolveStepIntoDocument,
  resolveStepIntoPad,
  padForThread,
  // Pad-targeted reducers + projections (recursive-resolve §6.3)
  setPadText,
  addPadAnnotation,
  hideSpan,
  revealHiddenInPad,
  getPadMoves,
  // Recursive resolve / drill-down (recursive-resolve §6.1, §6.4, §6.5, §7.6)
  drillIntoSpan,
  resolveThreadIntoParent,
  surfaceHead,
  surfaceThreadId,
  surfaceThreadPath,
  pushSurface,
  popSurface,
  jumpToSurfaceIndex,
  navigateToThread,
  discardThread,
  getContextMoves,
  ideasForPanel,
  // Draft phase state machine (stream-reflect-lifecycle)
  stampDraft,
  stageStepOutput,
  revealReflectPass,
  restreamDraft,
  enterReflect,
  leaveReflect,
  reanchorAnnotations,
  stagedConflicts,
  addLink,
  addPassageLink,
  removeLink,
  markNeedsSource,
  linksAt,
  textWithLinks,
  startSynthesis,
  quoteInto,
  synthesisToAcknowledge,
  addPendingSlot,
  applySlot,
  dropSlot,
  withCaveats,
  caveatsFor,
  unstageOutput,
  restreamFromDraftHistory,
  advanceToNextDraft,
  // Block reorder
  reorderBlock,
  // Open-item gate (capture-templates-proposal §8)
  DISPOSITION_KINDS,
  openItems,
  disposeOpenItem,
  clearDisposition,
  canResolve,
  drillThreadsAt,
  decidedItems,
} from "./thinkPadModel";

export {
  ideasToText,
  ideaRanges,
  ideaIdForRange,
  ensureDocIdeas,
  syncIdeasFromNodes,
} from "./ideas";
