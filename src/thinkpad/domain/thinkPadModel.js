// ---------------------------------------------------------------------------
// ThinkPad model — recursive thread tree with state on entities.
//
// A Pad is one independent document surface the user can resume.
// Internally it is a recursive tree of threads:
//   - pad.threads         Thread[] — root-level sibling threads
//   - thread.subThreads   Thread[] — sub-threads opened by drilling into a span
//   - thread.steps        Step[]   — a thread carries a single goal step
//   - thread.doc          the thread's own drill-down sub-pad surface
//   - thread.parentAnchor back-ref to the parent span it resolves into (drills only)
//
// A Step is the thread's goal and its result: { id, title, output }. (Legacy
// timing/pause/notes fields still ride on the persisted step shape pending
// removal, but nothing reads or writes them.) Each Pad and each thread.doc is a
// document surface { text, annotations, phase, ... } that the move and
// draft-phase reducers below operate on.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// This module is the PURE functional core. It never reads the clock or mints
// ids on its own: every timestamp arrives as `now` (an ISO string) and every id
// as the output of `makeId(prefix)`, both supplied by the imperative shell via
// the options object. Functions that build sub-entities forward `makeId` down.
// ---------------------------------------------------------------------------

import { INTENT_CLASSES, ANNOTATION_TAG_LIST } from "../moves";
import { formTextFromSteps } from "./formFromSteps";
import {
  ideasToText,
  syncIdeasFromNodes,
  reconcileIdeasFromText,
  ensureDocIdeas,
  ideaIdForRange,
  docHasMultipleIdeas,
  remapAnnotationsForIdeaReorder,
  ideaRanges,
  ideasFromText,
} from "./ideas";

const DEFAULT_CONFIG = Object.freeze({
  timing: Object.freeze({ enabled: true, timeboxMinutes: 10 }),
});

/** A fresh, empty document surface (root pad.doc or any thread's sub-pad). */
function emptyDoc() {
  return {
    text: "",
    ideas: [],
    annotations: [],
    phase: "stream",
    frozenText: null,
    frozenIdeas: null,
    staged: [],
    draftHistory: [],
    lifted: [],
  };
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function createStep({ id, title } = {}, { makeId } = {}) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return {
    id: typeof id === "string" && id ? id : makeId("step"),
    title: trimmed,
    output: "",
  };
}

export function createThread({ title, id, now } = {}, { makeId } = {}) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return null;
  const step = createStep({ title: trimmed }, { makeId });
  return {
    id: typeof id === "string" && id ? id : makeId("thread"),
    steps: [step],
    subThreads: [],
    // Each thread owns a document surface (its drill-down sub-pad) and a back-ref
    // to the parent anchor it resolves into — empty/null for a base move; a focus
    // drill seeds the doc and sets parentAnchor. (recursive-resolve contract)
    doc: emptyDoc(),
    parentAnchor: null,
    createdAt: now,
  };
}

export function createPad({ id, title, config, now } = {}, { makeId } = {}) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return {
    id: typeof id === "string" && id ? id : makeId("pad"),
    title: trimmed,
    threads: [],
    // surfaceThreadId: which surface is shown — null = root document, a thread id =
    // that thread's sub-pad. The breadcrumb trail is derived from the tree on read.
    surfaceThreadId: null,
    config: config ? { ...DEFAULT_CONFIG, ...config } : { ...DEFAULT_CONFIG },
    state: "new",
    createdAt: now,
    updatedAt: now,
    resumeHint: null,
    doc: emptyDoc(),
  };
}

// ---------------------------------------------------------------------------
// Thread projections — pure reads
// ---------------------------------------------------------------------------

/**
 * A thread is "open" when its sub-pad contains more than one block (paragraph-
 * separated by a blank line). Open threads need an explicit synthesized result
 * at complete time (the resolve-move prompt); single-block pads can roll up
 * directly. Returns false for empty/single-block pads.
 */
export function threadIsOpen(thread) {
  return docHasMultipleIdeas(thread?.doc);
}

export function findStepInThread(thread, stepId) {
  if (!thread || stepId == null) return null;
  return (thread.steps ?? []).find((s) => s.id === stepId) ?? null;
}

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

/** Find a step anywhere in the tree (recursive — used by note/step lookups). */
export function findStepDeep(pad, stepId) {
  if (!pad || stepId == null) return null;
  function visit(thread) {
    const hit = findStepInThread(thread, stepId);
    if (hit) return hit;
    for (const drill of thread.subThreads ?? []) {
      const r = visit(drill);
      if (r) return r;
    }
    return null;
  }
  for (const thread of pad.threads ?? []) {
    const r = visit(thread);
    if (r) return r;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Immutable update helpers
// ---------------------------------------------------------------------------

function withThreads(pad, threads, { now } = {}) {
  let nextState = pad.state;
  if (nextState === "new" && threads.length > 0) nextState = "active";
  else if (nextState === "active" && threads.length === 0) nextState = "completed";
  return { ...pad, threads, state: nextState, updatedAt: now };
}

// ---------------------------------------------------------------------------
// Push reducers
// ---------------------------------------------------------------------------

export function addRootThread(pad, { title } = {}, { now, makeId } = {}) {
  if (!pad) return { pad, pushed: null };
  const thread = createThread({ title, now }, { makeId });
  if (!thread) return { pad, pushed: null };
  const nextThreads = [...(pad.threads ?? []), thread];
  return { pad: withThreads(pad, nextThreads, { now }), pushed: thread };
}

function patchThreadTree(thread, patchFn) {
  const next = patchFn(thread);
  if (next !== thread) return next;
  const subThreads = thread.subThreads ?? [];
  let changed = false;
  const nextDrills = subThreads.map((drill) => {
    const patched = patchThreadTree(drill, patchFn);
    if (patched !== drill) changed = true;
    return patched;
  });
  return changed ? { ...thread, subThreads: nextDrills } : thread;
}

// ---------------------------------------------------------------------------
// Pad-level mutations
// ---------------------------------------------------------------------------

export function setResumeHint(pad, hint, { now } = {}) {
  if (!pad) return pad;
  const trimmed = typeof hint === "string" ? hint.trim() : null;
  if ((pad.resumeHint ?? null) === (trimmed || null)) return pad;
  return {
    ...pad,
    resumeHint: trimmed || null,
    updatedAt: now,
  };
}

export function setTitle(pad, title, { now } = {}) {
  if (!pad) return pad;
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (pad.title === trimmed) return pad;
  return {
    ...pad,
    title: trimmed,
    updatedAt: now,
  };
}

// Root-document convenience: the padLocator=null case of setPadText (see the
// pad-addressing section below). Kept as the public name the store imports.
export function setThinkPadText(pad, text, { now } = {}) {
  return setPadText(pad, { padLocator: null, text }, { now });
}

// Root-document convenience: the padLocator=null case of addPadAnnotation (see
// the pad-addressing section below). Kept as the public name the store imports.
export function addThinkPadAnnotation(pad, annotation, { now } = {}) {
  return addPadAnnotation(pad, { padLocator: null, annotation }, { now });
}

// ---------------------------------------------------------------------------
// Think-pad-first reducers (promotion, output write-back, history)
//
// A "promoted" step is a sibling step in the active leaf thread, carrying an
// anchor annotation that ties it to the span of think-pad text that motivated
// it. selectedText is the anchor (provenance); stepTitle is the user-authored
// prompt — they are deliberately distinct. On completion, a step's `output`
// REPLACES its anchored span in the document (resolveStepIntoDocument).
// ---------------------------------------------------------------------------

/** Patch a specific step (by id) anywhere in the thread tree; same ref if unchanged. */
function patchStepByIdInThreads(threads, stepId, patchFn) {
  let changed = false;
  const next = (threads ?? []).map((root) =>
    patchThreadTree(root, (thread) => {
      let stepChanged = false;
      const nextSteps = (thread.steps ?? []).map((step) => {
        if (step.id !== stepId) return step;
        const patched = patchFn(step);
        if (patched === step) return step;
        stepChanged = true;
        return patched;
      });
      if (!stepChanged) return thread;
      changed = true;
      return { ...thread, steps: nextSteps };
    }),
  );
  return changed ? next : threads;
}

/**
 * Promote a highlighted span into an INDEPENDENT sibling thread — its own root
 * thread on pad.threads, carrying one step seeded with the authored prompt.
 * The selection is an anchor; `title` is the user-authored prompt (≠ selectedText).
 * Siblings stay at depth 1; nesting (subThreads) is reserved for drill-down.
 * Returns { pad, step, annotationId }.
 */
export function promoteSpanToMove(pad, {
  title, selectionStart, selectionEnd, selectedText = "",
  stepId = null, annotationId = null,
  move = "", writeBack = "replace", padLocator = null,
} = {}, { now, makeId } = {}) {
  const noop = { pad, step: null, annotationId: null };
  if (!pad) return noop;
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return noop;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart >= selectionEnd
  ) return noop;
  // padLocator chooses WHICH pad the anchor is written into (root or a sub-pad),
  // never where the thread lives — a promoted move is always an independent root
  // sibling. Reject an unknown locator before minting, so we never strand a
  // stepless anchor. (recursive-resolve contract §6.3, correction)
  if (padForThread(pad, padLocator) == null) return noop;
  const sid = typeof stepId === "string" && stepId ? stepId : makeId("step");
  const aid = typeof annotationId === "string" && annotationId ? annotationId : makeId("ann");
  const step = createStep({ id: sid, title: trimmed }, { makeId });

  // Every promoted thought is an INDEPENDENT sibling thread: its own root thread
  // on pad.threads, never another step appended to a shared thread. Sibling
  // threads stay at depth 1 — nesting (subThreads) is reserved for drill-down.
  const nextThreads = [...(pad.threads ?? []), {
    id: makeId("thread"),
    steps: [step],
    subThreads: [],
    doc: emptyDoc(),
    parentAnchor: null,
    createdAt: now,
  }];

  let next = withThreads(pad, nextThreads, { now });
  next = addPadAnnotation(next, { padLocator, annotation: {
    id: aid,
    selectionStart,
    selectionEnd,
    selectedText,
    source: typeof selectedText === "string" ? selectedText : "",
    stepId: sid,
    stepTitle: trimmed,
    move: typeof move === "string" ? move : "",
    writeBack: writeBack === "annotate" ? "annotate" : "replace",
    intent: null,
    note: "",
    createdAt: now,
    resolved: false,
    placement: "anchored",
    resolvedAt: null,
  } }, { now, makeId });
  return { pad: next, step, annotationId: aid };
}

/**
 * Capture a highlighted span as a PARKED idea: an entry in doc.annotations
 * with NO step and NO move performed yet (stepId === null). The lowest-friction
 * entry point — it records that a span caught the user's interest, optionally
 * typed by `intent`, without committing to any action. A parked idea later
 * becomes a worked thread via performMoveOnIdea, or stays parked indefinitely.
 * Moves are unaffected: only RESOLVED ideas surface there (getPadMoves).
 * Returns { pad, ideaId }.
 */
export function captureIdea(pad, {
  selectionStart, selectionEnd, selectedText = "",
  intent = null, note = "", ideaId = null,
} = {}, { now, makeId } = {}) {
  const noop = { pad, ideaId: null };
  if (!pad) return noop;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart >= selectionEnd
  ) return noop;
  const id = typeof ideaId === "string" && ideaId ? ideaId : makeId("idea");
  const text = typeof selectedText === "string" ? selectedText : "";
  const safe = pad.doc ?? { text: "", annotations: [] };
  return {
    pad: {
      ...pad,
      doc: {
        ...safe,
        annotations: [...(safe.annotations ?? []), {
          id,
          selectionStart,
          selectionEnd,
          selectedText: text,
          source: text,
          // Parked: no step and no move performed yet. stepId === null is the
          // single signal that distinguishes a parked idea from a worked thread.
          stepId: null,
          stepTitle: "",
          intent: INTENT_CLASSES.includes(intent) ? intent : null,
          note: typeof note === "string" ? note : "",
          move: "",
          writeBack: "replace",
          createdAt: now,
          resolved: false,
          placement: "anchored",
          resolvedAt: null,
        }],
      },
      updatedAt: now,
    },
    ideaId: id,
  };
}

/**
 * Perform a move on a PARKED idea: spin up its independent sibling thread (a root
 * thread + one step seeded with `title`) and stamp the move/write-back onto the
 * idea so resolveStepIntoDocument knows how to land the eventual output. This is
 * the deferred twin of promoteSpanToMove (the act-now path): it produces the same
 * thread shape, but starting from an already-captured idea. No-op when the idea
 * is unknown, already worked (has a stepId), or the title is blank.
 * Returns { pad, step }.
 */
export function performMoveOnIdea(pad, ideaId, {
  title, move = "", writeBack = "replace", stepId = null,
} = {}, { now, makeId } = {}) {
  const noop = { pad, step: null };
  if (!pad || typeof ideaId !== "string" || !ideaId) return noop;
  const annotations = pad.doc?.annotations ?? [];
  const idx = annotations.findIndex((a) => a.id === ideaId);
  if (idx === -1) return noop;
  if (annotations[idx].stepId) return noop; // already worked — a move was performed
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return noop;

  const sid = typeof stepId === "string" && stepId ? stepId : makeId("step");
  const step = createStep({ id: sid, title: trimmed }, { makeId });

  // The worked idea becomes its own INDEPENDENT sibling thread — a root thread at
  // depth 1, mirroring promoteSpanToMove so both entry paths yield identical threads.
  const nextThreads = [...(pad.threads ?? []), {
    id: makeId("thread"),
    steps: [step],
    subThreads: [],
    doc: emptyDoc(),
    parentAnchor: null,
    createdAt: now,
  }];

  const nextAnnotations = annotations.map((a, i) =>
    i === idx
      ? {
          ...a,
          stepId: sid,
          stepTitle: trimmed,
          move: typeof move === "string" ? move : "",
          writeBack: writeBack === "annotate" ? "annotate" : "replace",
        }
      : a,
  );

  let next = withThreads(pad, nextThreads, { now });
  next = {
    ...next,
    doc: {
      ...(next.doc ?? { text: "", annotations: [] }),
      annotations: nextAnnotations,
    },
  };
  return { pad: next, step };
}

/** Set a step's captured output text (by id). */
export function setStepOutput(pad, { stepId = null, output = "" } = {}, { now } = {}) {
  if (!pad || !stepId) return pad;
  const text = typeof output === "string" ? output : "";
  const nextThreads = patchStepByIdInThreads(pad.threads, stepId, (step) =>
    step.output === text ? step : { ...step, output: text },
  );
  if (nextThreads === pad.threads) return pad;
  return withThreads(pad, nextThreads, { now });
}

/**
 * Set a step's title by id, anywhere in the tree — used to rename a drilled
 * thread's goal from the breadcrumb/title. Same ref when unchanged.
 */
export function setStepTitleById(pad, { stepId = null, title = "" } = {}, { now } = {}) {
  if (!pad || !stepId) return pad;
  const trimmed = typeof title === "string" ? title.trim() : "";
  const nextThreads = patchStepByIdInThreads(pad.threads, stepId, (step) =>
    step.title === trimmed ? step : { ...step, title: trimmed },
  );
  if (nextThreads === pad.threads) return pad;
  return withThreads(pad, nextThreads, { now });
}

// ---------------------------------------------------------------------------
// Pad addressing — locate/patch a thread's document surface anywhere in the tree.
// A "pad locator" is null (the root document, pad.doc) or a thread id
// (that thread's doc). This is the spine of the recursive resolve: one splice
// targets the root doc OR any drilled sub-pad. (recursive-resolve contract)
// ---------------------------------------------------------------------------

/** Find a thread anywhere in the tree by id, or null. */
function findThreadById(pad, threadId) {
  if (!pad || !threadId) return null;
  let found = null;
  function visit(thread) {
    if (found) return;
    if (thread.id === threadId) { found = thread; return; }
    for (const drill of thread.subThreads ?? []) visit(drill);
  }
  for (const thread of pad.threads ?? []) visit(thread);
  return found;
}

/** Patch a thread (by id) anywhere in the tree; same ref if unchanged. */
function patchThreadById(threads, threadId, patchFn) {
  let changed = false;
  const next = (threads ?? []).map((root) =>
    patchThreadTree(root, (thread) => {
      if (thread.id !== threadId) return thread;
      const patched = patchFn(thread);
      if (patched === thread) return thread;
      changed = true;
      return patched;
    }),
  );
  return changed ? next : threads;
}

/** The document surface for a thread, or the root document when locator is null. */
export function padForThread(pad, padLocator = null) {
  if (padLocator == null) return pad?.doc ?? { text: "", annotations: [] };
  const thread = findThreadById(pad, padLocator);
  return thread?.doc ?? null;
}

/** Write a pad back to its location (root pad.doc, or a thread's doc). */
function withPad(pad, padLocator, nextDoc, { now } = {}) {
  if (padLocator == null) return { ...pad, doc: nextDoc, updatedAt: now };
  const nextThreads = patchThreadById(pad.threads, padLocator, (thread) => ({ ...thread, doc: nextDoc }));
  if (nextThreads === pad.threads) return pad;
  return { ...pad, threads: nextThreads, updatedAt: now };
}

/** Set a pad's text — padLocator null = the root document, a thread id = that thread's sub-pad. */
export function setPadText(pad, { padLocator = null, text, nodes = null } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad; // unknown thread — same ref
  if (doc.phase === "cultivate") return pad; // frozen — editing blocked until reveal
  const nextText = typeof text === "string" ? text : "";
  const base = ensureDocIdeas(doc, { makeId });
  const ideas = Array.isArray(nodes) && nodes.length > 0
    ? syncIdeasFromNodes(base.ideas ?? [], nodes, { makeId })
    : reconcileIdeasFromText(base.ideas ?? [], nextText, { makeId });
  const syncedText = ideasToText(ideas);
  const prevIdeas = base.ideas ?? [];
  const unchanged = (base.text ?? "") === syncedText
    && prevIdeas.length === ideas.length
    && prevIdeas.every((i, idx) => i.id === ideas[idx]?.id && i.text === ideas[idx]?.text);
  if (unchanged) return pad;
  // Writing moves offsets; keep drilled and hidden passages on their words.
  const annotations = reanchorAnnotations(syncedText, base.annotations ?? []);
  return withPad(pad, padLocator, { ...base, text: syncedText, ideas, annotations }, { now });
}

// ---------------------------------------------------------------------------
// Visibility toggle — hide spans the user no longer wants to see.
//
// A pure view concern, deliberately NOT a move: hiding records a lightweight
// "hidden" marker annotation over a range; the render layer collapses it so the
// text drops out of sight. pad.text is never touched, so revealing simply drops
// the marker and the text reappears. A hidden marker has no step, intent, or
// write-back — it is not an idea or an insight, just a range set out of view.
// ---------------------------------------------------------------------------

/**
 * Hide a span from view in a pad (the root document when padLocator is null, else
 * a sub-pad). Same ref on an invalid range or unknown pad. Returns the next pad.
 */
export function hideSpan(pad, { padLocator = null, selectionStart, selectionEnd, selectedText = "" } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart >= selectionEnd
  ) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const text = typeof selectedText === "string" ? selectedText : "";
  // Pushed directly (not via addPadAnnotation, which requires a stepId): a hidden
  // marker is stepless by design — it carries a range and nothing else.
  const annotation = {
    id: makeId("hide"),
    selectionStart,
    selectionEnd,
    selectedText: text,
    source: text,
    stepId: null,
    stepTitle: "",
    intent: null,
    note: "",
    move: "",
    writeBack: "replace",
    hidden: true,
    createdAt: now,
    resolved: false,
    placement: "anchored",
    resolvedAt: null,
  };
  return withPad(pad, padLocator, { ...doc, annotations: [...(doc.annotations ?? []), annotation] }, { now });
}

/**
 * Reveal everything hidden in a pad — drop every hidden marker. The underlying
 * text was never removed, so it reappears. Same ref when nothing is hidden.
 */
export function revealHiddenInPad(pad, { padLocator = null } = {}, { now } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const annotations = doc.annotations ?? [];
  const next = annotations.filter((a) => a.hidden !== true);
  if (next.length === annotations.length) return pad;
  return withPad(pad, padLocator, { ...doc, annotations: next }, { now });
}

/**
 * Add an anchor annotation to a PAD — padLocator null = the root document, a
 * thread id = that thread's sub-pad. Pad-targeted twin of addThinkPadAnnotation.
 * The stepId-required validation is LOAD-BEARING: a thread drill writes its parent
 * anchor carrying the CHILD step's id, so the roll-up (resolveStepIntoPad) can
 * re-find that anchor by stepId one level up. (recursive-resolve contract §6.3)
 */
export function addPadAnnotation(pad, { padLocator = null, annotation } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad; // unknown thread — same ref
  const base = ensureDocIdeas(doc, { makeId });
  const { id, selectionStart, selectionEnd, selectedText, source, stepId, stepTitle, move, writeBack, createdAt, resolved, placement, resolvedAt, intent, note, tag, ideaId, blockId } = annotation ?? {};
  if (
    typeof id !== "string" || !id ||
    typeof stepId !== "string" || !stepId ||
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart >= selectionEnd
  ) return pad;
  const explicitIdeaId = typeof ideaId === "string" && ideaId ? ideaId : blockId;
  const resolvedIdeaId = typeof explicitIdeaId === "string" && explicitIdeaId
    ? explicitIdeaId
    : ideaIdForRange(base.ideas, selectionStart, selectionEnd);
  const nextDoc = {
    ...base,
    annotations: [...(base.annotations ?? []), {
      id,
      ideaId: resolvedIdeaId,
      selectionStart,
      selectionEnd,
      selectedText: typeof selectedText === "string" ? selectedText : "",
      source: typeof source === "string" ? source : "",
      stepId,
      stepTitle: typeof stepTitle === "string" ? stepTitle : "",
      // Intent (the passive noun) and a freeform note ride along uniformly so
      // worked ideas and parked ones share one record shape. The worked path
      // leaves them empty; captureIdea is where they're set.
      intent: INTENT_CLASSES.includes(intent) ? intent : null,
      note: typeof note === "string" ? note : "",
      // Tag: the user's epistemic stance toward this span (question/expand/converge).
      // Distinct from `intent` (what the text IS) — tag is what you're doing with it.
      tag: ANNOTATION_TAG_LIST.includes(tag) ? tag : null,
      // The applied move's id (display/provenance) and its write-back mode
      // (how the splice lands the output). Both default to a freeform replace
      // so non-move promotions behave exactly as before.
      move: typeof move === "string" ? move : "",
      writeBack: writeBack === "annotate" ? "annotate" : "replace",
      createdAt: typeof createdAt === "string" && createdAt ? createdAt : now,
      resolved: resolved === true,
      placement: ["appended", "annotated"].includes(placement) ? placement : "anchored",
      resolvedAt: typeof resolvedAt === "string" && resolvedAt ? resolvedAt : null,
    }],
  };
  return withPad(pad, padLocator, nextDoc, { now });
}

/** Resolved-annotation moves of a PAD — padLocator null = the root document. */
export function getPadMoves(pad, padLocator = null) {
  if (!pad) return [];
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  return (doc.annotations ?? [])
    .filter((a) => a.resolved === true)
    .map((a) => ({
      id: a.id,
      source: a.source ?? "",
      output: a.selectedText ?? "",
      resolvedAt: a.resolvedAt ?? "",
      stepTitle: a.stepTitle ?? "",
      move: a.move ?? "",
    }))
    .sort((a, b) => (a.resolvedAt < b.resolvedAt ? -1 : 1));
}

/**
 * The splice CORE (private): write a step's output into a PAD at its anchor span
 * and report the changed region as `delta`. padLocator null = the root document
 * (pad.doc), a thread id = that thread's sub-pad. Tolerant: exact-range
 * match → re-find by selectedText → append fallback. Trailing annotations after
 * the splice shift by `amount`. Idempotent (an already-resolved step is a no-op)
 * and a no-op when output is empty.
 *
 * Returns { pad, delta } where delta = { padLocator, shiftFrom, amount } for a
 * real splice, or null for every no-op path. resolveStepIntoPad wraps this and
 * discards delta; the recursive roll-up (resolveThreadIntoParent) keeps it.
 *
 * SUSSMAN HOOK (deferred): a child's roll-up can invalidate sibling spans in the
 * parent pad ("goal clobbering"). v1 splices naively. `delta` is returned so a
 * future conflict-aware pass can re-validate siblings and surface clobbers rather
 * than overwrite silently. See docs/recursive-resolve-contract.md §6.6.
 */
function spliceStepIntoPad(pad, { stepId = null, padLocator = null, now } = {}) {
  const none = { pad, delta: null };
  if (!pad || !stepId) return none;
  const step = findStepDeep(pad, stepId);
  if (!step) return none;
  const output = typeof step.output === "string" ? step.output : "";
  if (!output) return none;
  const doc = padForThread(pad, padLocator);
  if (!doc) return none;
  const annotations = doc.annotations ?? [];
  const annIdx = annotations.findIndex((a) => a.stepId === stepId && a.resolved !== true);
  if (annIdx === -1) return none;

  const ann = annotations[annIdx];
  const text = doc.text ?? "";
  const anchor = typeof ann.selectedText === "string" ? ann.selectedText : "";
  // Perspective moves (Doubt, Support, Branch, …) ANNOTATE: keep the motivating
  // text and add the insight beside it. Convergent moves (Clarify, Resolve) and
  // freeform promotions REPLACE the span outright (mess → result).
  const annotate = ann.writeBack === "annotate";

  // Locate the anchor span: exact stored range → re-find by text → not found.
  let anchorStart;
  let anchorEnd;
  let found = false;
  if (anchor && text.slice(ann.selectionStart, ann.selectionEnd) === anchor) {
    anchorStart = ann.selectionStart;
    anchorEnd = ann.selectionEnd;
    found = true;
  } else if (anchor && text.indexOf(anchor) !== -1) {
    anchorStart = text.indexOf(anchor);
    anchorEnd = anchorStart + anchor.length;
    found = true;
  }

  let newText;
  let outStart; // where `output` begins in newText
  let placement;
  let shiftFrom; // annotations starting at/after this offset move by `amount`
  let amount;

  if (!found) {
    // Anchor gone — append at the end (identical for both write-back modes).
    const sep = text.length > 0 && !text.endsWith("\n") ? "\n" : "";
    outStart = text.length + sep.length;
    newText = text + sep + output;
    placement = "appended";
    shiftFrom = text.length;
    amount = sep.length + output.length;
  } else if (annotate) {
    // Insert the insight as its own block right after the anchor; keep the anchor.
    const after = text.slice(anchorEnd);
    const lead = "\n";
    const trail = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
    const insertion = lead + output + trail;
    newText = text.slice(0, anchorEnd) + insertion + after;
    outStart = anchorEnd + lead.length;
    placement = "annotated";
    shiftFrom = anchorEnd;
    amount = insertion.length;
  } else {
    // Replace the anchor span with the output.
    newText = text.slice(0, anchorStart) + output + text.slice(anchorEnd);
    outStart = anchorStart;
    placement = "anchored";
    shiftFrom = anchorEnd;
    amount = output.length - (anchorEnd - anchorStart);
  }

  const nextAnnotations = annotations.map((a, i) => {
    if (i === annIdx) {
      return {
        ...a,
        selectionStart: outStart,
        selectionEnd: outStart + output.length,
        selectedText: output,
        resolved: true,
        placement,
        resolvedAt: now,
      };
    }
    if (found && a.selectionStart >= shiftFrom) {
      return { ...a, selectionStart: a.selectionStart + amount, selectionEnd: a.selectionEnd + amount };
    }
    return a;
  });

  const nextDoc = { ...doc, text: newText, annotations: nextAnnotations };
  return {
    pad: withPad(pad, padLocator, nextDoc, { now }),
    delta: { padLocator: padLocator ?? null, shiftFrom, amount },
  };
}

/**
 * KEYSTONE: splice a step's output into a PAD at its anchor span — padLocator
 * null = the root document (pad.doc), a thread id = that thread's sub-pad.
 * Tolerant + idempotent (see spliceStepIntoPad). Returns the next pad only;
 * both the lens write-back and the recursive roll-up go through this splice.
 */
export function resolveStepIntoPad(pad, { stepId = null, padLocator = null, now } = {}) {
  return spliceStepIntoPad(pad, { stepId, padLocator, now }).pad;
}

/**
 * Back-compat base case: resolve a step's output into the ROOT document
 * (pad.doc) — the lens write-back. A drill resolves into its parent
 * thread's pad by passing padLocator (recursive-resolve contract, Slice 2).
 */
export function resolveStepIntoDocument(pad, { stepId = null, now } = {}) {
  return resolveStepIntoPad(pad, { stepId, padLocator: null, now });
}

// ---------------------------------------------------------------------------
// Recursive resolve (drill-down). Drill into a span → it opens its OWN nested
// sub-pad seeded from the span; think there; when it converges, roll the result
// back UP into the parent span. The whole surface (pad / threads / insights) is a
// pure function of the navigation stack head. A drill is the recursive case of a move; the
// lens is the base case. See docs/recursive-resolve-contract.md §6.
// ---------------------------------------------------------------------------

/**
 * Drill a span into its OWN nested sub-pad and (via the store) descend. The
 * recursive case of a move: instead of typing the output (the lens base case),
 * you derive it in a child think-pad seeded from the span. Creates a child thread
 * with one seeded goal step + a sub-pad seeded with selectedText, sets its
 * parentAnchor back-ref, pushes it (root threads when parentThreadId is null, else
 * the parent thread's subThreads), and writes the anchor annotation into the
 * PARENT pad carrying the CHILD step's id (the linchpin that lets the roll-up
 * reuse the keystone splice). The reducer does NOT move the surface pointer — the
 * store does, mirroring navigateToThread. Returns { pad, thread, annotationId }. (§6.1)
 */
export function drillIntoSpan(pad, {
  parentThreadId = null, title, selectionStart, selectionEnd, selectedText = "",
  move = "", writeBack = "replace", stepId = null, annotationId = null, frameId = null, tag = null,
} = {}, { now, makeId } = {}) {
  const noop = { pad, frame: null, annotationId: null };
  if (!pad) return noop;
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return noop;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart >= selectionEnd
  ) return noop;
  // The parent pad must exist: the root always does; a thread must be in the tree.
  if (padForThread(pad, parentThreadId) == null) return noop;

  const sid = typeof stepId === "string" && stepId ? stepId : makeId("step");
  const aid = typeof annotationId === "string" && annotationId ? annotationId : makeId("ann");
  const fid = typeof frameId === "string" && frameId ? frameId : makeId("thread");
  const seedText = typeof selectedText === "string" ? selectedText : "";

  // One seeded goal step, an empty sub-pad (user types freely; title carries the
  // context), and a parentAnchor back-ref pointing at the anchor we add below.
  const step = createStep({ id: sid, title: trimmed }, { makeId });
  const frame = {
    id: fid,
    move: typeof move === "string" ? move : "",
    steps: [step],
    subThreads: [],
    doc: emptyDoc(),
    parentAnchor: { annotationId: aid, parentFrameId: parentThreadId ?? null },
    createdAt: now,
  };

  // A root-level drill is a sibling root thread; a nested drill goes on its
  // parent thread's subThreads.
  const nextThreads = parentThreadId == null
    ? [...(pad.threads ?? []), frame]
    : patchThreadById(pad.threads, parentThreadId, (p) => ({
        ...p, subThreads: [...(p.subThreads ?? []), frame],
      }));
  let next = withThreads(pad, nextThreads, { now });

  // Anchor the span in the PARENT pad, carrying the child step's id.
  next = addPadAnnotation(next, { padLocator: parentThreadId ?? null, annotation: {
    id: aid,
    selectionStart,
    selectionEnd,
    selectedText: seedText,
    source: seedText,
    stepId: sid,
    stepTitle: trimmed,
    move: typeof move === "string" ? move : "",
    writeBack: writeBack === "annotate" ? "annotate" : "replace",
    tag: ANNOTATION_TAG_LIST.includes(tag) ? tag : null,
    createdAt: now,
    resolved: false,
    placement: "anchored",
    resolvedAt: null,
  } }, { now, makeId });

  return { pad: next, frame, annotationId: aid };
}

/**
 * Roll a drill's converged result UP into its parent span — the recursive
 * counterpart of the lens write-back, and THE keystone of this feature.
 * Single-loop (always): the result replaces/annotates the focused span in the
 * PARENT pad via the tested splice. Double-loop (optional, reframe.goal): also
 * rewrite the parent thread's goal — the drill changed what the parent is about.
 * Archives, never deletes: the sub-pad/thread stay; the parent anchor flips to
 * resolved (re-opening that span re-enters the drill). Idempotent; no-op on empty
 * result. Returns { pad, resolved, delta, parentFrameId, childStepId }: delta
 * is the reserved Sussman hook; parentFrameId/childStepId let the store ascend +
 * log without a second lookup. (§6.4)
 */
export function resolveThreadIntoParent(pad, { threadId, result, reframe = null } = {}, { now, makeId } = {}) {
  const noop = { pad, resolved: false, delta: null, parentFrameId: null, childStepId: null };
  if (!pad || !threadId) return noop;
  const frame = findThreadById(pad, threadId);
  if (!frame) return noop;
  const text = typeof result === "string" ? result.trim() : "";
  if (threadIsOpen(frame) && !text) return noop; // open thread — synthesize first
  if (!text) return noop; // empty result — nothing to fold up
  const anchor = frame.parentAnchor;
  if (!anchor || typeof anchor.annotationId !== "string" || !anchor.annotationId) return noop;
  const childStep = frame.steps?.[0]; // a focus thread has exactly one seeded goal step
  if (!childStep) return noop;
  const parentFrameId = anchor.parentFrameId ?? null;

  // Idempotency: if the parent anchor is already resolved, return the SAME ref —
  // BEFORE setStepOutput, which would otherwise mint a new ref and report a
  // misleading resolved:true. The only true same-ref no-op on re-resolve.
  const parentDoc = padForThread(pad, parentFrameId);
  const anchorRec = (parentDoc?.annotations ?? []).find((a) => a.id === anchor.annotationId);
  if (anchorRec?.resolved === true) {
    return { pad, resolved: true, delta: null, parentFrameId, childStepId: childStep.id };
  }

  // Single-loop (always): set the child's output, then splice it into the parent
  // pad at the anchor using the tested tolerant logic. Items accepted at this
  // thread's gate travel up as caveats on the result.
  let next = withCaveats(pad, threadId, { now });
  next = setStepOutput(next, { stepId: childStep.id, output: text }, { now });
  const spliced = spliceStepIntoPad(next, { stepId: childStep.id, padLocator: parentFrameId, now });
  next = spliced.pad;
  if (anchorRec?.synthesis === true) {
    next = settleSynthesis(next, parentFrameId, anchorRec.id, { now, makeId });
  }

  // Double-loop (optional): rewrite the parent's framing/goal.
  const goal = typeof reframe?.goal === "string" ? reframe.goal.trim() : "";
  if (goal && parentFrameId != null) {
    const parentStep = findThreadById(next, parentFrameId)?.steps?.[0];
    if (parentStep) {
      const nextThreads = patchStepByIdInThreads(next.threads, parentStep.id, (s) =>
        s.title === goal ? s : { ...s, title: goal },
      );
      if (nextThreads !== next.threads) next = withThreads(next, nextThreads, { now });
    }
  }
  // parentFrameId == null: the root document has no goal object, so a reframe
  // degrades to span-replacement only. Rewriting the root's framing is a manual
  // title edit in v1 — the price of keeping pad.doc special. (§6.4.3)

  return { pad: next, resolved: true, delta: spliced.delta, parentFrameId, childStepId: childStep.id };
}

// ---------------------------------------------------------------------------
// Surface navigation — a single pointer (pad.surfaceThreadId) drives which pad
// shows; the breadcrumb trail is DERIVED from the owns-tree on read, never
// stored. null = root document, a thread id = that thread's sub-pad. (§6.5)
// ---------------------------------------------------------------------------

/** The surface pointer: null = root document, a thread id = that thread's sub-pad. */
export function surfaceHead(pad) {
  return pad?.surfaceThreadId ?? null;
}

/** Thread id on the surface, or null on the root document. (Alias of surfaceHead.) */
export function surfaceThreadId(pad) {
  return pad?.surfaceThreadId ?? null;
}

function findTreePathToThread(pad, targetId) {
  if (!pad || !targetId) return [];
  function visit(thread, trail) {
    const nextTrail = [...trail, thread];
    if (thread.id === targetId) return nextTrail;
    for (const drill of thread.subThreads ?? []) {
      const hit = visit(drill, nextTrail);
      if (hit) return hit;
    }
    return null;
  }
  for (const root of pad.threads ?? []) {
    const hit = visit(root, []);
    if (hit) return hit;
  }
  return [];
}

/**
 * Root → surface thread chain for the breadcrumb (excludes the root document).
 * Derived from the owns-tree: the surface pointer is only the leaf id, so the
 * ancestor trail is recomputed here rather than stored as a stack.
 */
export function surfaceThreadPath(pad) {
  return findTreePathToThread(pad, pad?.surfaceThreadId ?? null);
}

/** Navigate to a thread at any depth (null = root document). No-op if unknown/unchanged. */
export function navigateToThread(pad, threadId, { now } = {}) {
  if (!pad) return pad;
  const target = typeof threadId === "string" && threadId ? threadId : null;
  if (target !== null && !findThreadById(pad, target)) return pad;
  if ((pad.surfaceThreadId ?? null) === target) return pad;
  return { ...pad, surfaceThreadId: target, updatedAt: now };
}

/** Descend onto a child thread — with a single pointer this just sets the head. */
export function pushSurface(pad, threadId, { now } = {}) {
  return navigateToThread(pad, threadId, { now });
}

/** Ascend one level — move the surface to the current thread's parent (or root). */
export function popSurface(pad, { now } = {}) {
  if (!pad) return pad;
  const path = findTreePathToThread(pad, pad.surfaceThreadId ?? null);
  if (path.length === 0) return pad; // already at the root document
  const parent = path.length >= 2 ? path[path.length - 2].id : null;
  return navigateToThread(pad, parent, { now });
}

/** Jump to a breadcrumb index (0 = root document, i = the i-th ancestor thread). */
export function jumpToSurfaceIndex(pad, index, { now } = {}) {
  if (!pad) return pad;
  const path = findTreePathToThread(pad, pad.surfaceThreadId ?? null);
  const i = typeof index === "number" ? Math.floor(index) : 0;
  const target = i <= 0 ? null : (path[i - 1]?.id ?? null);
  return navigateToThread(pad, target, { now });
}

/**
 * Discard an EMPTY drill on abandon: remove the thread from its parent's
 * subThreads (or the root threads) AND remove its parent-pad anchor — but ONLY
 * when the drill is truly untouched (empty body, no resolved annotation, no step
 * output, no children, not completed). Otherwise same ref: a worked drill is
 * never destroyed. Keeps abandoned loops from littering the breadcrumb without
 * violating "steps never shrink" — a never-worked thread carries no state. Only
 * acts on subThreads (threads with a parentAnchor). (§7.6 / invariant #5)
 */
export function discardThread(pad, threadId, { now } = {}) {
  if (!pad || !threadId) return pad;
  const thread = findThreadById(pad, threadId);
  if (!thread || !thread.parentAnchor) return pad; // not a drill — leave it
  const parentFrameId = thread.parentAnchor.parentFrameId ?? null;
  const annotationId = thread.parentAnchor.annotationId ?? null;

  // A drill is "untouched" (abandonable) when the user typed nothing: sub-pads
  // start empty (no seeding), so an empty body means untouched. The anchor must
  // be unresolved to even consider discarding — a resolved anchor means work
  // happened (the result was written back). Plus: no own annotations, no step
  // output, no children, not completed. Any disqualifier → keep.
  const parentDoc = padForThread(pad, parentFrameId);
  const anchorRec = (parentDoc?.annotations ?? []).find((a) => a.id === annotationId) ?? null;
  const seed = anchorRec && anchorRec.resolved !== true ? (anchorRec.selectedText ?? "") : null;
  const bodyUntouched = seed !== null && (thread.doc?.text ?? "") === "";
  const noOwnAnnotations = (thread.doc?.annotations ?? []).length === 0;
  const noOutput = (thread.steps?.[0]?.output ?? "") === "";
  const noChildren = (thread.subThreads ?? []).length === 0;
  const notCompleted = !thread.steps?.[0]?.completedAt;
  if (!(bodyUntouched && noOwnAnnotations && noOutput && noChildren && notCompleted)) return pad;

  const nextThreads = parentFrameId == null
    ? (pad.threads ?? []).filter((t) => t.id !== threadId)
    : patchThreadById(pad.threads, parentFrameId, (p) => ({
        ...p, subThreads: (p.subThreads ?? []).filter((d) => d.id !== threadId),
      }));
  // A plain threads swap, NOT withThreads: abandoning a drill must never complete the
  // document, even when it removes the last root thread (withThreads would flip
  // active→completed on an empty list). State is preserved.
  let next = { ...pad, threads: nextThreads, updatedAt: now };

  // Remove the now-dangling parent-pad anchor.
  if (annotationId) {
    const doc = padForThread(next, parentFrameId);
    const annotations = (doc?.annotations ?? []).filter((a) => a.id !== annotationId);
    if (doc && annotations.length !== doc.annotations.length) {
      next = withPad(next, parentFrameId, { ...doc, annotations }, { now });
    }
  }
  return next;
}

/**
 * Set (or clear) the tag on an annotation in any pad surface.
 * padLocator null = the root document, a thread id = a sub-pad. No-op when
 * the annotation is not found or the tag is already the target value.
 */
export function tagPadAnnotation(pad, { padLocator = null, annotationId, tag } = {}, { now } = {}) {
  if (!pad || !annotationId) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const annotations = doc.annotations ?? [];
  const idx = annotations.findIndex((a) => a.id === annotationId);
  if (idx === -1) return pad;
  const cur = annotations[idx];
  const nextTag = ANNOTATION_TAG_LIST.includes(tag) ? tag : null;
  if ((cur.tag ?? null) === nextTag) return pad;
  const nextAnnotations = [...annotations];
  nextAnnotations[idx] = { ...cur, tag: nextTag };
  return withPad(pad, padLocator, { ...doc, annotations: nextAnnotations }, { now });
}

/** Patch a single annotation by id (offsets, resolved flag, etc.). */
export function updateThinkPadAnnotation(pad, annotationId, patch = {}, { now } = {}) {
  if (!pad || !annotationId) return pad;
  const annotations = pad.doc?.annotations ?? [];
  const idx = annotations.findIndex((a) => a.id === annotationId);
  if (idx === -1) return pad;
  const cur = annotations[idx];
  const merged = { ...cur, ...patch, id: cur.id };
  const changed = Object.keys(merged).some((k) => merged[k] !== cur[k]);
  if (!changed) return pad;
  const nextAnnotations = [...annotations];
  nextAnnotations[idx] = merged;
  return {
    ...pad,
    doc: { ...(pad.doc ?? { text: "", annotations: [] }), annotations: nextAnnotations },
    updatedAt: now,
  };
}

/**
 * Derive the ordered list of moves from resolved annotations.
 * Root-document convenience: the padLocator=null case of getPadMoves.
 */
export function getContextMoves(pad) {
  return getPadMoves(pad, null);
}

/**
 * Project every idea into a unified panel row — the basis for the one Ideas list
 * where parked captures and worked threads share the same space. One array,
 * three derived states:
 *   parked   — stepId === null: a captured span, no move performed yet
 *   active   — has a step, not resolved: a thread in progress
 *   resolved — output written back (also surfaces via getPadMoves)
 * `frameId` is the root thread for worked ideas (null while parked), so the
 * panel can drive focus/lens controls. Order is capture order (newest last).
 */
export function ideasForPanel(pad) {
  if (!pad) return [];
  // Hidden markers are a pure visibility concern, never ideas — keep them out.
  const annotations = (pad.doc?.annotations ?? []).filter((a) => a.hidden !== true);
  const roots = pad.threads ?? [];
  return annotations.map((a) => {
    const parked = !a.stepId;
    const state = parked ? "parked" : a.resolved === true ? "resolved" : "active";
    const thread = parked
      ? null
      : roots.find((t) => (t.steps ?? []).some((s) => s.id === a.stepId)) ?? null;
    return {
      ideaId: a.id,
      state,
      intent: a.intent ?? null,
      note: a.note ?? "",
      text: a.selectedText ?? "",
      source: a.source ?? "",
      move: a.move ?? "",
      stepId: a.stepId ?? null,
      stepTitle: a.stepTitle ?? "",
      frameId: thread ? thread.id : null,
      createdAt: a.createdAt ?? "",
      resolvedAt: a.resolvedAt ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Draft phase state machine (stream ↔ cultivate).
//
// Phase is a property of a DOC surface, not a UI mode. A doc starts in
// 'stream' (mutable free-write). Stamping freezes it — setPadText becomes a
// no-op; moves stage against the frozen snapshot; revealReflectPass applies
// all staged splices atomically → new version. Re-streaming forks a new
// free-write sibling thread (no parentAnchor), leaving the cultivating doc
// intact. See docs/stream-reflect-lifecycle.md.
// ---------------------------------------------------------------------------

/**
 * Stamp a doc: freeze it, snapshot text as frozenText, mint version 0, and
 * transition to cultivate mode. No-op when already cultivating.
 * padLocator null = the root document, a thread id = that thread's sub-pad.
 */
export function stampDraft(pad, { padLocator = null } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const rawDoc = padForThread(pad, padLocator);
  if (!rawDoc) return pad;
  if (rawDoc.phase === "cultivate") return pad; // already stamped — same ref
  const doc = ensureDocIdeas(rawDoc, { makeId });
  const frozenText = doc.text ?? "";
  const frozenIdeas = (doc.ideas ?? []).map((i) => ({ ...i }));
  const nextDoc = {
    ...doc,
    phase: "cultivate",
    frozenText,
    frozenIdeas,
    staged: doc.staged ?? [],
  };
  return withPad(pad, padLocator, nextDoc, { now });
}

/**
 * Stage a step's intended output against the frozen draft — buffer the splice
 * without applying it. Guard: no-op when the doc is not in cultivate phase or
 * stepId is missing. DOES NOT call resolveStepIntoPad; all staged outputs are
 * applied atomically at revealReflectPass. padLocator null = root document.
 */
export function stageStepOutput(pad, {
  stepId = null, annotationId = null, text = "", padLocator = null,
} = {}, { now, makeId } = {}) {
  if (!pad || !stepId) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return pad; // guard: cultivate only
  const ann = (doc.annotations ?? []).find(
    (a) => a.id === annotationId || a.stepId === stepId,
  );
  const ideaId = ann?.ideaId ?? ann?.blockId ?? null;
  const nextDoc = {
    ...doc,
    staged: [...(doc.staged ?? []), {
      id: makeId("staged"),
      stepId,
      annotationId: typeof annotationId === "string" && annotationId ? annotationId : null,
      ideaId,
      text: typeof text === "string" ? text : "",
      at: now,
    }],
  };
  return withPad(pad, padLocator, nextDoc, { now });
}

/**
 * Staged results whose anchors overlap on the frozen draft (D6; lifecycle §10.8).
 * Splicing them in one pass would write over each other, so the reveal waits
 * until each group is settled. Returns groups (each of 2+ items, in document
 * order): { stagedId, stepId, annotationId, source, text, start, end }.
 * Spans that only touch end-to-start do not overlap. [] when none.
 */
export function stagedConflicts(pad, padLocator = null) {
  if (!pad) return [];
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  const annotations = doc.annotations ?? [];
  const items = (doc.staged ?? [])
    .map((st) => {
      const ann = annotations.find((a) => a.id === st.annotationId || a.stepId === st.stepId);
      if (!ann || typeof ann.selectionStart !== "number" || typeof ann.selectionEnd !== "number") return null;
      return {
        stagedId: st.id,
        stepId: st.stepId,
        annotationId: ann.id,
        source: ann.selectedText ?? "",
        text: st.text ?? "",
        start: ann.selectionStart,
        end: ann.selectionEnd,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  // Sweep in start order: an item joins the current group while it starts
  // before the group's furthest end.
  const groups = [];
  let current = [];
  let reach = -Infinity;
  for (const item of items) {
    if (current.length && item.start < reach) {
      current.push(item);
      reach = Math.max(reach, item.end);
    } else {
      if (current.length > 1) groups.push(current);
      current = [item];
      reach = item.end;
    }
  }
  if (current.length > 1) groups.push(current);
  return groups;
}

/**
 * Take one result out of staging. Its thread and step output stay, so the
 * thread can be reopened and resolved again later. Same ref for an unknown id.
 */
export function unstageOutput(pad, { padLocator = null, stagedId } = {}, { now } = {}) {
  if (!pad || !stagedId) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const staged = doc.staged ?? [];
  const next = staged.filter((st) => st.id !== stagedId);
  if (next.length === staged.length) return pad;
  return withPad(pad, padLocator, { ...doc, staged: next }, { now });
}

/**
 * Reveal pass: apply all staged outputs atomically, then clear staging.
 * Splices are applied in REVERSE document order (end → start) so offset shifts
 * from rightward splices do not corrupt leftward anchor positions that haven't
 * been processed yet. Phase stays 'cultivate' after reveal — the study beat is
 * a transient UI state, not stored here. No-op when nothing is staged or the
 * doc is not in cultivate phase.
 */
export function revealReflectPass(pad, { padLocator = null } = {}, { now } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return pad;
  const staged = doc.staged ?? [];
  if (!staged.length) return pad;

  // Determine reverse-document order: find each entry's anchor start position.
  // Falls back to Infinity (end of doc) so position-unknown entries apply last.
  const withPositions = staged.map((s) => {
    const ann = (doc.annotations ?? []).find(
      (a) => a.id === s.annotationId || a.stepId === s.stepId,
    );
    return { ...s, anchorStart: ann?.selectionStart ?? Infinity };
  }).sort((a, b) => b.anchorStart - a.anchorStart);

  // Set each step's output then splice, in the sorted order.
  let next = pad;
  for (const entry of withPositions) {
    next = setStepOutput(next, { stepId: entry.stepId, output: entry.text }, { now });
    next = resolveStepIntoPad(next, { stepId: entry.stepId, padLocator, now });
  }

  // Clear the staging area after applying all splices.
  const updatedDoc = padForThread(next, padLocator) ?? doc;
  const nextDoc = { ...updatedDoc, staged: [] };
  return withPad(next, padLocator, nextDoc, { now });
}

/**
 * Re-stream: unfreeze the current doc so it can be edited directly again.
 * The phase flips back to 'stream'; any staged (unrevealed) outputs are
 * discarded since their offsets may no longer be valid after direct editing.
 * frozenText is preserved as a record of the cultivation pass.
 * padLocator null = root document; a thread id = that sub-pad.
 */
export function restreamDraft(pad, { padLocator = null } = {}, { now } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return pad; // already in stream — no-op
  const nextDoc = { ...doc, phase: "stream", staged: [] };
  return withPad(pad, padLocator, nextDoc, { now });
}

/**
 * Branch from a historical draft: set doc.text to draftHistory[n].text and
 * place the doc back in stream phase, discarding any staged outputs.  The
 * draftHistory array is left intact so the user can still navigate the full
 * history. Freezes/frozenText are cleared (this is equivalent to a fresh edit
 * starting from that snapshot rather than from the latest live text).
 *
 * This is the fix for the navigation-consistency bug: the current `restreamDraft`
 * only knows how to unfreeze from the live frozenText; it has no way to restore
 * from a historical entry. This function provides that capability.
 *
 * padLocator null = root document; a thread id = that sub-pad.
 * n is the index into doc.draftHistory[]. Out-of-range n is a no-op.
 */
export function restreamFromDraftHistory(pad, { padLocator = null, n = 0 } = {}, { now } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const entry = (doc.draftHistory ?? [])[n];
  if (!entry) return pad; // out-of-range or no history — no-op
  const nextDoc = {
    ...doc,
    text: entry.text,
    phase: "stream",
    frozenText: null,
    staged: [],
  };
  return withPad(pad, padLocator, nextDoc, { now });
}

/**
 * Advance to the next draft: collect move contributions from staged outputs,
 * apply them atomically via revealReflectPass, record the transition in
 * draftHistory, then re-stamp so the next cultivation pass begins immediately
 * in reflect (cultivate) mode — the user stays in reflect mode, not stream.
 *
 * draftHistory[0] is seeded with the original frozen text on first call.
 * Each subsequent call appends the new draft text + the contributions that
 * produced it. padLocator null = root document; a thread id = that sub-pad.
 */
export function advanceToNextDraft(pad, { padLocator = null } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return pad;
  const staged = doc.staged ?? [];
  if (!staged.length) return pad;
  if (stagedConflicts(pad, padLocator).length > 0) return pad; // settle overlaps first (D6)

  // Collect contributions before reveal clears doc.staged.
  const annotations = doc.annotations ?? [];
  const contributions = staged.map((s) => {
    const ann = annotations.find((a) => a.id === s.annotationId || a.stepId === s.stepId);
    return {
      annotationId: s.annotationId ?? null,
      stepId: s.stepId,
      moveId: ann?.move ?? null,
      intent: ann?.intent ?? null,
      tag: ann?.tag ?? null,
      source: ann?.selectedText ?? ann?.source ?? "",
      output: s.text,
      ...(Array.isArray(ann?.caveats) && ann.caveats.length ? { caveats: ann.caveats } : {}),
    };
  });

  // Seed draftHistory[0] with the original frozen text on first advancement.
  let next = pad;
  const draftHistory = doc.draftHistory ?? [];
  if (draftHistory.length === 0) {
    const seedDoc = {
      ...doc,
      draftHistory: [{
        n: 0,
        text: doc.frozenText ?? doc.text ?? "",
        at: now,
        contributions: [],
      }],
    };
    next = withPad(next, padLocator, seedDoc, { now });
  }

  // Apply the reveal pass (splices text, sets step outputs, clears staging).
  next = revealReflectPass(next, { padLocator }, { now, makeId });

  // Append the new draft snapshot with its contributions.
  const revealedDoc = padForThread(next, padLocator);
  const prevHistory = revealedDoc.draftHistory ?? [];
  const newDoc = {
    ...revealedDoc,
    draftHistory: [
      ...prevHistory,
      { n: prevHistory.length, text: revealedDoc.text ?? "", at: now, contributions },
    ],
  };
  next = withPad(next, padLocator, newDoc, { now });

  // Re-stamp with the new text so the next cultivation pass starts from a clean baseline.
  // frozenText must equal text so new annotations have valid offsets for the next reveal.
  // The reveal splices text only, so bring the paragraph lists (ideas are the source of
  // truth; text is derived) back in step with it, keeping ids paragraph by paragraph.
  const advancedDoc = padForThread(next, padLocator);
  const revealedText = advancedDoc.text ?? "";
  const ideas = reconcileIdeasFromText(advancedDoc.ideas ?? [], revealedText, { makeId });
  const restampedDoc = {
    ...advancedDoc,
    ideas,
    frozenIdeas: ideas.map((i) => ({ ...i })),
    frozenText: revealedText,
    staged: [],
  };
  next = withPad(next, padLocator, restampedDoc, { now });
  const synthesisAnn = annotations.find((a) => a.synthesis === true && contributions.some((c) => c.annotationId === a.id));
  return synthesisAnn ? settleSynthesis(next, padLocator, synthesisAnn.id, { now, makeId }) : next;
}

// ---------------------------------------------------------------------------
// Reflect as a state (roadmap Revisions 14 and 15).
//
// The document is living. Entering Reflect freezes it and records a draft
// version when the text changed since the last one; leaving Reflect applies
// any waiting results first (a reflect pass), then returns to writing.
// Writing moves offsets, so drilled passages are re-found by their words on
// the way in; one whose words are gone is marked `lost`.
// ---------------------------------------------------------------------------

/**
 * Re-find each annotation's passage in `text` by its words, choosing the
 * occurrence nearest its old start. Unchanged annotations keep their object;
 * the array is returned as-is when nothing moved. Annotations without anchor
 * text (pins) are left alone.
 */
export function reanchorAnnotations(text, annotations) {
  const source = typeof text === "string" ? text : "";
  let changed = false;
  const next = (annotations ?? []).map((ann) => {
    const words = typeof ann?.selectedText === "string" ? ann.selectedText : "";
    if (!words) return ann;
    const start = Number.isFinite(ann.selectionStart) ? ann.selectionStart : 0;
    if (source.slice(start, start + words.length) === words && ann.selectionEnd === start + words.length && !ann.lost) {
      return ann;
    }
    let best = -1;
    for (let at = source.indexOf(words); at !== -1; at = source.indexOf(words, at + 1)) {
      if (best === -1 || Math.abs(at - start) < Math.abs(best - start)) best = at;
    }
    changed = true;
    if (best === -1) return ann.lost ? ann : { ...ann, lost: true };
    const { lost: _lost, ...rest } = ann;
    return { ...rest, selectionStart: best, selectionEnd: best + words.length };
  });
  return changed ? next : annotations;
}

/** Enter Reflect: re-anchor, freeze, and record a version if the text changed. */
export function enterReflect(pad, { padLocator = null } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase === "cultivate") return pad;
  if (!(doc.text ?? "").trim()) return pad;
  const annotations = reanchorAnnotations(doc.text ?? "", doc.annotations ?? []);
  let next = annotations === (doc.annotations ?? [])
    ? pad
    : withPad(pad, padLocator, { ...doc, annotations }, { now });
  next = stampDraft(next, { padLocator }, { now, makeId });
  const stamped = padForThread(next, padLocator);
  const text = stamped.frozenText ?? stamped.text ?? "";
  const history = stamped.draftHistory ?? [];
  if (history.length && history[history.length - 1].text === text) return next;
  const entry = history.length === 0
    ? { n: 0, text, at: now, contributions: [] }
    : { n: history.length, text, at: now, contributions: [], pass: "stream" };
  return withPad(next, padLocator, { ...stamped, draftHistory: [...history, entry] }, { now });
}

/**
 * Leave Reflect for writing. Waiting results are applied first (as a new
 * version), so writing resumes on the newest draft. Same ref while results
 * overlap (settle those first) or when not reflecting.
 */
export function leaveReflect(pad, { padLocator = null } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return pad;
  if (stagedConflicts(pad, padLocator).length > 0) return pad;
  const next = (doc.staged ?? []).length > 0
    ? advanceToNextDraft(pad, { padLocator }, { now, makeId })
    : pad;
  const applied = padForThread(next, padLocator);
  return withPad(next, padLocator, {
    ...applied,
    phase: "stream",
    staged: [],
    frozenText: null,
    frozenIdeas: null,
  }, { now });
}

// ---------------------------------------------------------------------------
// Links and "needs a source" (roadmap Revisions 15 and 22).
//
// A link is an annotation on a passage. It points at a URL, or at another
// paragraph as a snapshot connection: it keeps the text and draft version it
// drew on and never changes; linksAt only reports whether that paragraph was
// later refined (or is gone). Attaching a link opens no item. "Needs a source"
// is an annotation that stays an open item until a link overlaps it or it is
// decided at the gate. The document text never changes; textWithLinks writes
// URL links out as Markdown when text leaves the pad.
// ---------------------------------------------------------------------------

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function overlaps(a, b) {
  return a.selectionStart < b.selectionEnd && b.selectionStart < a.selectionEnd;
}

function coveredByLink(doc, ann) {
  return (doc.annotations ?? []).some((l) => l.link && l.hidden !== true && overlaps(l, ann));
}

function rangeIn(doc, { selectionStart, selectionEnd, selectedText }) {
  const text = doc.text ?? "";
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return null;
  if (selectionStart < 0 || selectionEnd > text.length || selectionStart >= selectionEnd) return null;
  const words = text.slice(selectionStart, selectionEnd);
  if (typeof selectedText === "string" && selectedText && selectedText !== words) return null;
  return { selectionStart, selectionEnd, selectedText: words };
}

function withAnnotation(pad, padLocator, doc, annotation, { now }) {
  return withPad(pad, padLocator, { ...doc, annotations: [...(doc.annotations ?? []), annotation] }, { now });
}

/** Attach a URL to a passage (a document action; opens nothing). */
export function addLink(pad, { padLocator = null, selectionStart, selectionEnd, selectedText, href } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const url = typeof href === "string" ? href.trim() : "";
  if (!URL_PATTERN.test(url)) return pad;
  const span = rangeIn(doc, { selectionStart, selectionEnd, selectedText });
  if (!span) return pad;
  return withAnnotation(pad, padLocator, doc, {
    id: makeId("ann"), ...span, stepId: null, createdAt: now, link: { kind: "url", href: url },
  }, { now });
}

/**
 * Link a passage to another paragraph of the same level: a snapshot connection
 * keeping the target's text and the current draft version.
 */
export function addPassageLink(pad, { padLocator = null, selectionStart, selectionEnd, selectedText, targetIdeaId } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const raw = padForThread(pad, padLocator);
  if (!raw) return pad;
  const doc = ensureDocIdeas(raw, { makeId });
  const span = rangeIn(doc, { selectionStart, selectionEnd, selectedText });
  if (!span) return pad;
  const target = ideaRanges(doc.ideas ?? []).find((r) => r.id === targetIdeaId);
  if (!target) return pad;
  if (span.selectionStart >= target.start && span.selectionEnd <= target.end) return pad; // its own paragraph
  const history = doc.draftHistory ?? [];
  return withAnnotation(pad, padLocator, doc, {
    id: makeId("ann"), ...span, stepId: null, createdAt: now,
    link: { kind: "passage", ideaId: target.id, snapshot: target.text, draftN: history.length ? history.length - 1 : null, at: now },
  }, { now });
}

/** Take a link off. Same ref for an unknown id or a non-link annotation. */
export function removeLink(pad, { padLocator = null, annotationId } = {}, { now } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc || !(doc.annotations ?? []).some((a) => a.id === annotationId && a.link)) return pad;
  return withPad(pad, padLocator, { ...doc, annotations: doc.annotations.filter((a) => a.id !== annotationId) }, { now });
}

/** Mark a passage as needing a source: an open item until a link covers it or it is decided. */
export function markNeedsSource(pad, { padLocator = null, selectionStart, selectionEnd, selectedText } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const span = rangeIn(doc, { selectionStart, selectionEnd, selectedText });
  if (!span) return pad;
  return withAnnotation(pad, padLocator, doc, {
    id: makeId("ann"), ...span, stepId: null, createdAt: now, needsSource: true,
  }, { now });
}

/**
 * The links at one level, in document order: { annotationId, kind, selectionStart,
 * selectionEnd, selectedText, href } for URLs, and for passages { ideaId, snapshot,
 * draftN, current, refined, lost }.
 */
export function linksAt(pad, padLocator = null) {
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  // A quote's source lives on the level the synthesis was opened from.
  const ideasFor = (link) => (link.padLocator === undefined ? doc : padForThread(pad, link.padLocator))?.ideas ?? [];
  return (doc.annotations ?? [])
    .filter((a) => a.link && a.hidden !== true)
    .sort((a, b) => a.selectionStart - b.selectionStart)
    .map((a) => {
      const base = {
        annotationId: a.id, kind: a.link.kind,
        selectionStart: a.selectionStart, selectionEnd: a.selectionEnd, selectedText: a.selectedText ?? "",
        lostAnchor: a.lost === true,
      };
      if (a.link.kind === "url") return { ...base, href: a.link.href };
      const target = ideasFor(a.link).find((i) => i.id === a.link.ideaId);
      return {
        ...base,
        ...(a.link.quote ? { quote: true } : {}),
        ideaId: a.link.ideaId,
        snapshot: a.link.snapshot,
        draftN: a.link.draftN ?? null,
        current: target ? target.text : null,
        refined: !!target && target.text !== a.link.snapshot,
        lost: !target,
      };
    });
}

/** The level's text with URL links written as Markdown, for text leaving the pad. */
export function textWithLinks(pad, padLocator = null) {
  const doc = padForThread(pad, padLocator);
  if (!doc) return "";
  let text = doc.text ?? "";
  const urls = (doc.annotations ?? [])
    .filter((a) => a.link?.kind === "url" && !a.lost && text.slice(a.selectionStart, a.selectionEnd) === a.selectedText)
    .sort((a, b) => b.selectionStart - a.selectionStart);
  let lastStart = Infinity;
  for (const a of urls) {
    if (a.selectionEnd > lastStart) continue; // overlapping links: keep the later one
    text = `${text.slice(0, a.selectionStart)}[${a.selectedText}](${a.link.href})${text.slice(a.selectionEnd)}`;
    lastStart = a.selectionStart;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Synthesize with quoting (roadmap Revisions 19 to 22).
//
// A synthesis is a thread opened on the whole draft of a level (thread and
// anchor carry `synthesis: true`). Quoting copies a paragraph of that level
// into it with a snapshot link back. Resolving replaces the whole draft with
// the thesis; threads still open there are acknowledged first (the UI asks),
// then re-anchored to the thesis: they remember the passage they were opened
// on (`originalText`) and their results are added beside the thesis. The
// thesis gets fresh paragraph ids: the old passages were synthesized, not
// refined, so quotes of them read as coming from an earlier draft.
// ---------------------------------------------------------------------------

function openSynthesisAt(pad, padLocator) {
  const doc = padForThread(pad, padLocator);
  const threads = padLocator == null ? (pad.threads ?? []) : (findThreadById(pad, padLocator)?.subThreads ?? []);
  return threads.find((t) => {
    if (!t.synthesis) return false;
    const ann = (doc?.annotations ?? []).find((a) => a.id === t.parentAnchor?.annotationId);
    return ann && ann.resolved !== true;
  }) ?? null;
}

/** Open (or return the open) synthesis thread on a level in Reflect: { pad, frame }. */
export function startSynthesis(pad, { padLocator = null } = {}, { now, makeId } = {}) {
  const noop = { pad, frame: null };
  if (!pad) return noop;
  const doc = padForThread(pad, padLocator);
  if (!doc || doc.phase !== "cultivate") return noop;
  const text = doc.frozenText ?? doc.text ?? "";
  if (!text.trim()) return noop;
  const existing = openSynthesisAt(pad, padLocator);
  if (existing) return { pad, frame: existing };
  const d = drillIntoSpan(pad, {
    parentThreadId: padLocator, title: "Synthesis", selectionStart: 0, selectionEnd: text.length, selectedText: text,
  }, { now, makeId });
  if (!d.frame) return noop;
  let next = withThreads(d.pad, patchThreadById(d.pad.threads, d.frame.id, (t) => ({ ...t, synthesis: true })), { now });
  const parentDoc = padForThread(next, padLocator);
  next = withPad(next, padLocator, {
    ...parentDoc,
    annotations: parentDoc.annotations.map((a) => (a.id === d.annotationId ? { ...a, synthesis: true } : a)),
  }, { now });
  return { pad: next, frame: findThreadById(next, d.frame.id) };
}

/** Quote a paragraph of the synthesized level into the synthesis (while writing it). */
export function quoteInto(pad, { threadId, sourceIdeaId } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  const thread = findThreadById(pad, threadId);
  if (!thread?.synthesis) return pad;
  const level = thread.parentAnchor?.parentFrameId ?? null;
  const sourceDoc = padForThread(pad, level);
  const source = (ensureDocIdeas(sourceDoc ?? {}, { makeId }).ideas ?? []).find((i) => i.id === sourceIdeaId);
  if (!source || !source.text.trim()) return pad;
  const doc = padForThread(pad, threadId);
  if (!doc || doc.phase === "cultivate") return pad;
  const before = doc.text ?? "";
  const nextText = before.trim() ? `${before}\n\n${source.text}` : source.text;
  let next = setPadText(pad, { padLocator: threadId, text: nextText }, { now, makeId });
  const written = padForThread(next, threadId);
  const start = (written.text ?? "").length - source.text.length;
  const history = sourceDoc.draftHistory ?? [];
  return withAnnotation(next, threadId, written, {
    id: makeId("ann"), selectionStart: start, selectionEnd: start + source.text.length, selectedText: source.text,
    stepId: null, createdAt: now,
    link: {
      kind: "passage", quote: true, padLocator: level, ideaId: source.id, snapshot: source.text,
      draftN: history.length ? history.length - 1 : null, at: now,
    },
  }, { now });
}

/** The open items a synthesis would replace: everything open on its level but itself. */
export function synthesisToAcknowledge(pad, threadId) {
  const thread = findThreadById(pad, threadId);
  if (!thread?.synthesis) return [];
  const level = thread.parentAnchor?.parentFrameId ?? null;
  return openItems(pad, level).filter((i) => i.id !== thread.parentAnchor.annotationId);
}

/** After a synthesis replaced a level's text: re-anchor what is still open, fresh paragraph ids. */
function settleSynthesis(pad, padLocator, synthesisAnnotationId, { now, makeId }) {
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const text = doc.text ?? "";
  const stillOpen = (a) => a.id !== synthesisAnnotationId && !a.disposition && a.hidden !== true
    && ((typeof a.stepId === "string" && a.stepId && a.resolved !== true) || a.needsSource === true);
  const others = reanchorAnnotations(text, (doc.annotations ?? []).filter((a) => a.id !== synthesisAnnotationId && !stillOpen(a)));
  const byId = new Map(others.map((a) => [a.id, a]));
  const annotations = (doc.annotations ?? []).map((a) => {
    if (a.id === synthesisAnnotationId) return a;
    if (stillOpen(a)) {
      const { lost: _lost, ...rest } = a;
      return {
        ...rest, selectionStart: 0, selectionEnd: text.length, selectedText: text,
        originalText: a.originalText ?? a.selectedText ?? "", writeBack: "annotate",
      };
    }
    return byId.get(a.id) ?? a;
  });
  const ideas = ideasFromText(text, { makeId });
  const frozen = doc.phase === "cultivate"
    ? { frozenText: text, frozenIdeas: ideas.map((i) => ({ ...i })) }
    : {};
  return withPad(pad, padLocator, { ...doc, annotations, ideas, ...frozen }, { now });
}

// ---------------------------------------------------------------------------
// Block reorder — move a paragraph block to a new position within a doc.
// ---------------------------------------------------------------------------

/**
 * Reorder an idea within a doc by index into doc.ideas.
 * `fromIdx` / `toIdx` match the UI block indices (candidateSpans / hoveredBlockIdx).
 */
export function reorderBlock(pad, { padLocator = null, fromIdx, toIdx } = {}, { now, makeId } = {}) {
  if (!pad) return pad;
  if (typeof fromIdx !== "number" || typeof toIdx !== "number" || fromIdx === toIdx) return pad;

  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;

  const base = ensureDocIdeas(doc, { makeId });
  const ideas = (base.ideas ?? []).filter((i) => (i.text ?? "").trim().length > 0);
  if (fromIdx < 0 || fromIdx >= ideas.length || toIdx < 0 || toIdx >= ideas.length) return pad;

  const reordered = [...ideas];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);
  const newText = ideasToText(reordered);
  const newAnnotations = remapAnnotationsForIdeaReorder(base.annotations, ideas, reordered);

  let frozenText = base.frozenText ?? null;
  let frozenIdeas = base.frozenIdeas ?? null;
  if (base.phase === "cultivate" && frozenText != null) {
    const frozenList = (base.frozenIdeas ?? base.ideas ?? []).filter((i) => (i.text ?? "").trim());
    if (fromIdx < frozenList.length && toIdx < frozenList.length) {
      const nextFrozen = [...frozenList];
      const [movedFrozen] = nextFrozen.splice(fromIdx, 1);
      nextFrozen.splice(toIdx, 0, movedFrozen);
      frozenIdeas = nextFrozen.map((i) => ({ ...i }));
      frozenText = ideasToText(nextFrozen);
    }
  }

  return withPad(pad, padLocator, {
    ...base,
    text: newText,
    ideas: reordered,
    annotations: newAnnotations,
    frozenText,
    frozenIdeas,
  }, { now });
}

// ---------------------------------------------------------------------------
// Open-item gate (docs/capture-templates-proposal.md §8).
//
// An OPEN ITEM is a move you started at a level that hasn't resolved: an anchor
// annotation carrying a stepId that is not resolved, not staged for the next
// reveal, not hidden, and has no disposition. An item LIFTED up from a lower
// level is an open item at its new level too (doc.lifted). Writing never creates
// an open item; starting a move does. A thread cannot resolve up while it has any
// undecided open item, so nothing is lost on the way up.
//
// Each open item is closed by working it (it resolves) or by one disposition:
//   accepted — room for doubt: go ahead anyway; the note becomes a caveat later
//   lifted   — out of scope here: it becomes an open item at an ancestor level
//   parked   — its own work: it leaves this inquiry (to the shelf, once it exists)
// ---------------------------------------------------------------------------

export const DISPOSITION_KINDS = Object.freeze(["accepted", "lifted", "parked"]);

function isOpenAnchor(annotation, stagedIds) {
  return !!annotation
    && typeof annotation.stepId === "string" && annotation.stepId !== ""
    && annotation.resolved !== true
    && annotation.hidden !== true
    && !annotation.disposition
    && !stagedIds.has(annotation.id);
}

/** The thread whose goal step is `stepId` (drills and promoted moves alike), or null. */
function threadIdForStep(pad, stepId) {
  let found = null;
  function visit(thread) {
    if (found) return;
    if ((thread.steps ?? []).some((s) => s.id === stepId)) { found = thread.id; return; }
    for (const drill of thread.subThreads ?? []) visit(drill);
  }
  for (const thread of pad?.threads ?? []) visit(thread);
  return found;
}

/**
 * Levels strictly above `padLocator`, nearest last: [null (root), ...thread ids].
 * [] for the root (nothing is above it); null for an unknown thread.
 */
function ancestorLocators(pad, padLocator) {
  if (padLocator == null) return [];
  const path = findTreePathToThread(pad, padLocator);
  if (!path.length) return null;
  return [null, ...path.slice(0, -1).map((t) => t.id)];
}

/**
 * The undecided open items of one level (null = root document, a thread id = its
 * sub-pad), in document order then lift order:
 *   { id, kind: "move",   text, source, threadId }   a started, unresolved move
 *   { id, kind: "lifted", text, source, from }        an item lifted from below
 * [] for an unknown level.
 */
export function openItems(pad, padLocator = null) {
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  const stagedIds = new Set((doc.staged ?? []).map((s) => s.annotationId).filter(Boolean));
  const moves = (doc.annotations ?? [])
    .filter((a) => isOpenAnchor(a, stagedIds))
    .map((a) => ({
      id: a.id,
      kind: "move",
      text: a.stepTitle || a.selectedText || "",
      source: a.selectedText ?? "",
      threadId: threadIdForStep(pad, a.stepId),
    }));
  // "Needs a source" (Revision 15): open until a link covers the passage or it is decided.
  const sources = (doc.annotations ?? [])
    .filter((a) => a.needsSource === true && !a.disposition && a.hidden !== true && !coveredByLink(doc, a))
    .map((a) => ({ id: a.id, kind: "source", text: a.selectedText ?? "", source: a.selectedText ?? "" }));
  const lifted = (doc.lifted ?? [])
    .filter((l) => !l.disposition)
    .map((l) => ({
      id: l.id,
      kind: "lifted",
      text: l.text,
      source: l.source,
      from: { padLocator: l.from?.padLocator ?? null, annotationId: l.from?.annotationId ?? null },
    }));
  return [...moves, ...sources, ...lifted];
}

/**
 * Decide an open item at a level: accept it as room for doubt, park it as its own
 * work, or lift it to a strict ancestor (`target`: null = root, else a thread id),
 * where it becomes an open item with `note` (or the item's own text) as its text.
 * Same ref when the level or item is unknown, the item is not open, the kind is
 * invalid, or a lift target is not a strict ancestor.
 */
export function disposeOpenItem(pad, {
  padLocator = null, id, kind, note = "", target = null,
} = {}, { now, makeId } = {}) {
  if (!pad || typeof id !== "string" || !id) return pad;
  if (!DISPOSITION_KINDS.includes(kind)) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const liftTarget = target ?? null;
  if (kind === "lifted") {
    const ancestors = ancestorLocators(pad, padLocator);
    if (!ancestors || !ancestors.includes(liftTarget)) return pad;
  }
  const item = openItems(pad, padLocator).find((i) => i.id === id);
  if (!item) return pad;

  const trimmed = typeof note === "string" ? note.trim() : "";
  const disposition = { kind, note: trimmed, target: kind === "lifted" ? liftTarget : null, at: now };
  const nextDoc = item.kind === "move" || item.kind === "source"
    ? { ...doc, annotations: doc.annotations.map((a) => (a.id === id ? { ...a, disposition } : a)) }
    : { ...doc, lifted: doc.lifted.map((l) => (l.id === id ? { ...l, disposition } : l)) };
  let next = withPad(pad, padLocator, nextDoc, { now });

  if (kind === "lifted") {
    const targetDoc = padForThread(next, liftTarget);
    next = withPad(next, liftTarget, {
      ...targetDoc,
      lifted: [...(targetDoc.lifted ?? []), {
        id: makeId("lifted"),
        text: trimmed || item.text,
        source: item.source,
        from: { padLocator: padLocator ?? null, annotationId: id },
        at: now,
        disposition: null,
      }],
    }, { now });
  }
  return next;
}

/**
 * Undo a decision so the item is open again. Undoing a lift also removes the item
 * it opened above — but only while that item is still undecided; once it was
 * decided at its new level the lift stands (same ref). Same ref when the item has
 * no decision.
 */
export function clearDisposition(pad, { padLocator = null, id } = {}, { now } = {}) {
  if (!pad || typeof id !== "string" || !id) return pad;
  const doc = padForThread(pad, padLocator);
  if (!doc) return pad;
  const annotation = (doc.annotations ?? []).find((a) => a.id === id && a.disposition);
  const liftedEntry = annotation ? null : (doc.lifted ?? []).find((l) => l.id === id && l.disposition);
  const disposition = annotation?.disposition ?? liftedEntry?.disposition;
  if (!disposition) return pad;

  let next = pad;
  if (disposition.kind === "lifted") {
    const targetLocator = disposition.target ?? null;
    const targetDoc = padForThread(next, targetLocator);
    const entry = (targetDoc?.lifted ?? []).find((l) =>
      l.from?.annotationId === id && (l.from?.padLocator ?? null) === (padLocator ?? null));
    if (entry?.disposition) return pad; // decided above — the lift stands
    if (entry) {
      next = withPad(next, targetLocator, {
        ...targetDoc, lifted: targetDoc.lifted.filter((l) => l !== entry),
      }, { now });
    }
  }
  const currentDoc = padForThread(next, padLocator);
  const nextDoc = annotation
    ? { ...currentDoc, annotations: currentDoc.annotations.map((a) => (a.id === id ? { ...a, disposition: null } : a)) }
    : { ...currentDoc, lifted: currentDoc.lifted.map((l) => (l.id === id ? { ...l, disposition: null } : l)) };
  return withPad(next, padLocator, nextDoc, { now });
}

/**
 * The threads drilled from one level, in creation order, as the surface lists
 * them: { threadId, annotationId, title, anchorText, hasWork, completed, tag,
 * status }. status is "resolved" (its result has come back up), "converged"
 * (ready to resolve: one block, no undecided open items) or "open".
 * padLocator null = the root document; a thread id = that sub-pad. Every level
 * is the same primitive, so a sub-pad lists its own threads exactly as the
 * root does. [] for no pad, an unknown level, or a level with no threads.
 */
export function drillThreadsAt(pad, padLocator = null) {
  if (!pad) return [];
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  const threads = padLocator === null || padLocator === undefined
    ? (pad.threads ?? [])
    : (findThreadById(pad, padLocator)?.subThreads ?? []);
  const annotations = doc.annotations ?? [];
  return threads
    .filter((t) => t.parentAnchor)
    .map((t) => {
      const ann = annotations.find((a) => a.id === t.parentAnchor.annotationId);
      // Resolved = its result went up: the step carries an output (staged or
      // applied) or the anchor was spliced. completedAt is no longer written.
      const step = t.steps?.[0];
      const isResolved = ann?.resolved === true
        || (typeof step?.output === "string" && step.output.trim() !== "")
        || !!step?.completedAt;
      return {
        threadId: t.id,
        annotationId: t.parentAnchor.annotationId,
        title: t.steps?.[0]?.title ?? "Untitled",
        anchorText: ann?.originalText ?? ann?.selectedText ?? "",
        hasWork: (t.doc?.text ?? "").trim() !== "",
        completed: isResolved,
        tag: ann?.tag ?? null,
        status: isResolved ? "resolved" : canResolve(pad, t.id) ? "converged" : "open",
        caveats: Array.isArray(ann?.caveats) ? ann.caveats.length : 0,
      };
    });
}

/**
 * Whether a thread may resolve up into its parent: it has converged to one
 * non-empty block and has no undecided open items. False for the root document
 * (nothing is above it) and for an unknown thread.
 */
export function canResolve(pad, threadId) {
  if (!pad || typeof threadId !== "string" || !threadId) return false;
  const thread = findThreadById(pad, threadId);
  if (!thread) return false;
  if ((thread.doc?.text ?? "").trim() === "") return false;
  if (threadIsOpen(thread)) return false;
  return openItems(pad, threadId).length === 0;
}

/**
 * The items of one level that already carry a decision, in document order then
 * lift order: { id, kind: "move" | "lifted", text, source, disposition }. Lets
 * the gate show what was decided (and offer undo). [] for an unknown level.
 */
export function decidedItems(pad, padLocator = null) {
  const doc = padForThread(pad, padLocator);
  if (!doc) return [];
  const moves = (doc.annotations ?? [])
    .filter((a) => a.disposition && typeof a.stepId === "string" && a.stepId)
    .map((a) => ({
      id: a.id,
      kind: "move",
      text: a.stepTitle || a.selectedText || "",
      source: a.selectedText ?? "",
      disposition: a.disposition,
    }));
  const sources = (doc.annotations ?? [])
    .filter((a) => a.disposition && a.needsSource === true)
    .map((a) => ({ id: a.id, kind: "source", text: a.selectedText ?? "", source: a.selectedText ?? "", disposition: a.disposition }));
  const lifted = (doc.lifted ?? [])
    .filter((l) => l.disposition)
    .map((l) => ({ id: l.id, kind: "lifted", text: l.text, source: l.source, disposition: l.disposition }));
  return [...moves, ...sources, ...lifted];
}

// ---------------------------------------------------------------------------
// Slotting a workflow into a thread (roadmap Phase 2). ThinkPad asks the
// library for steps (want "choose-steps"); the pad remembers which thread is
// waiting (pad.pendingSlots), and the reply is written into that thread as a
// document: a heading per step, after whatever is already there.
// ---------------------------------------------------------------------------

/** Remember that `threadId` is waiting on request `handoffId`. Same ref for an unknown thread. */
export function addPendingSlot(pad, { handoffId, threadId } = {}, { now } = {}) {
  if (!pad || typeof handoffId !== "string" || !handoffId || !findThreadById(pad, threadId)) return pad;
  const pending = (pad.pendingSlots ?? []).filter((s) => s.handoffId !== handoffId);
  return { ...pad, pendingSlots: [...pending, { handoffId, threadId }], updatedAt: now };
}

/** Forget a pending request (it came back empty or was abandoned). */
export function dropSlot(pad, { handoffId } = {}, { now } = {}) {
  if (!pad || !(pad.pendingSlots ?? []).some((s) => s.handoffId === handoffId)) return pad;
  return { ...pad, pendingSlots: pad.pendingSlots.filter((s) => s.handoffId !== handoffId), updatedAt: now };
}

/** Write a reply's steps into the waiting thread as a document, and forget the request. */
export function applySlot(pad, { handoffId, steps } = {}, { now, makeId } = {}) {
  const slot = (pad?.pendingSlots ?? []).find((s) => s.handoffId === handoffId);
  if (!slot) return pad;
  const next = dropSlot(pad, { handoffId }, { now });
  return writeStepsInto(next, { threadId: slot.threadId, steps }, { now, makeId });
}

/** Write steps into a thread as a document (a # heading per step), after what is there. */
export function writeStepsInto(pad, { threadId, steps } = {}, { now, makeId } = {}) {
  let next = pad;
  const doc = padForThread(next, threadId);
  const form = formTextFromSteps(steps);
  if (!doc || !form || !threadId) return next;
  if (doc.phase === "cultivate") next = leaveReflect(next, { padLocator: threadId }, { now, makeId });
  const before = (padForThread(next, threadId)?.text ?? "").trim();
  return setPadText(next, { padLocator: threadId, text: before ? `${before}\n\n${form}` : form }, { now, makeId });
}


// ---------------------------------------------------------------------------
// Caveats (capture-templates §8.2; roadmap §4.2). An item accepted at a
// thread's gate ("go ahead anyway") travels up with its result: the note
// written when accepting it, or the item's own text. Stored on the parent
// anchor annotation as `caveats`.
// ---------------------------------------------------------------------------

/** Copy the thread's accepted items onto its parent anchor as caveats. */
export function withCaveats(pad, threadId, { now } = {}) {
  const thread = findThreadById(pad, threadId);
  const anchor = thread?.parentAnchor;
  if (!anchor?.annotationId) return pad;
  const caveats = decidedItems(pad, threadId)
    .filter((d) => d.disposition?.kind === "accepted")
    .map((d) => (d.disposition.note || d.text || "").trim())
    .filter(Boolean);
  if (!caveats.length) return pad;
  const level = anchor.parentFrameId ?? null;
  const doc = padForThread(pad, level);
  if (!doc) return pad;
  return withPad(pad, level, {
    ...doc,
    annotations: (doc.annotations ?? []).map((a) => (a.id === anchor.annotationId ? { ...a, caveats } : a)),
  }, { now });
}

/** The caveats a resolved passage carries ([] when none). */
export function caveatsFor(pad, padLocator, annotationId) {
  const doc = padForThread(pad, padLocator);
  const ann = (doc?.annotations ?? []).find((a) => a.id === annotationId);
  return Array.isArray(ann?.caveats) ? ann.caveats : [];
}

// ---------------------------------------------------------------------------
// Open loops (roadmap Phase 4). ThinkPad reports its own unfinished work so a
// workspace view can list it without reading ThinkPad's data: every thread at
// any depth that has not been resolved, with one next step and a place.
// ---------------------------------------------------------------------------

export function openLoopsFor(pad) {
  if (!pad) return [];
  const loops = [];
  function visit(locator) {
    for (const t of drillThreadsAt(pad, locator)) {
      if (t.status !== "resolved") {
        loops.push({
          tool: "thinkpad",
          id: `${pad.id}:${t.threadId}`,
          title: t.title,
          where: pad.title || "Untitled pad",
          next: t.status === "converged" ? "Ready to resolve" : t.hasWork ? "Keep working it" : "Start it",
          at: pad.updatedAt ?? null,
          place: { pad: pad.id, thread: t.threadId },
        });
      }
      visit(t.threadId);
    }
  }
  visit(null);
  return loops;
}

// ---------------------------------------------------------------------------
// Export (roadmap Phase 4): one pad to Markdown. The current draft on top
// (links written as Markdown), then every thread nested below with its
// state, the passage it was opened on, any caveats, and its own text.
// ---------------------------------------------------------------------------

const STATUS_WORDS = { open: "open", converged: "ready to resolve", resolved: "resolved" };

export function exportPadMarkdown(pad) {
  if (!pad) return "";
  const lines = [`# ${pad.title || "Untitled pad"}`, ""];
  const root = textWithLinks(pad, null).trim();
  if (root) lines.push(root, "");
  const threadLines = [];
  function visit(locator, depth) {
    for (const t of drillThreadsAt(pad, locator)) {
      const hashes = "#".repeat(Math.min(6, depth + 2));
      threadLines.push(`${hashes} ${t.title} · ${STATUS_WORDS[t.status] ?? t.status}`, "");
      if (t.anchorText) threadLines.push(`> ${t.anchorText.replace(/\n+/g, " ")}`, "");
      for (const c of caveatsFor(pad, locator, t.annotationId)) threadLines.push(`*Caveat: ${c}*`, "");
      const body = textWithLinks(pad, t.threadId).trim();
      if (body) threadLines.push(body, "");
      visit(t.threadId, depth + 1);
    }
  }
  visit(null, 1);
  if (threadLines.length) lines.push("---", "", "## Threads", "", ...threadLines);
  return lines.join("\n");
}
