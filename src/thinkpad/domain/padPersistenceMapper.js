// ---------------------------------------------------------------------------
// Pad persistence mapper — entity-state model: runtime state lives on entities
// and is never derived from an event log. (A separate, append-only
// `pad.history` side-log is persisted for reflection only; it never feeds
// runtime state.)
//
// The app is pre-deployment and keeps NO persisted-format backwards
// compatibility: there is no schema version and no legacy-field tolerance. The
// normalizer validates the current shape and default-fills missing fields; if
// the in-memory model changes, stored records are re-created, not migrated.
//
// Record shape:
//   { id, title, threads, config, state, createdAt, updatedAt, resumeHint,
//     doc, history }
//
// Each Thread in `threads` has:
//   { id,
//     steps[],                       // never structurally mutated post-create
//     subThreads: Thread[],
//     doc: { text, annotations[] },                         // its drill-down sub-pad
//     parentAnchor: { annotationId, parentFrameId } | null, // where it resolves into
//     createdAt }
//
// Each Step has:
//   { id, title, output }
// ---------------------------------------------------------------------------

import { INTENT_CLASSES } from "../moves";

// ---------------------------------------------------------------------------
// Helpers
//
// This module is part of the PURE functional core: it never reads the clock.
// When a persisted record is missing a timestamp, the default comes from an
// injected `now` (an ISO string), threaded down from the normalizer entry
// points (normalizePadRecord / buildPadSnapshot) by the imperative
// shell. Ids are REQUIRED — a record without an id is dropped, never
// fabricated.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = Object.freeze({
  timing: { enabled: true, timeboxMinutes: 10 },
});

function normalizeConfig(value) {
  if (!value || typeof value !== "object") return { ...DEFAULT_CONFIG };
  return {
    timing: { ...DEFAULT_CONFIG.timing, ...(value.timing ?? {}) },
  };
}

function normalizeThinkPadAnnotation(value, { now } = {}) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  const selectionStart = Number(value.selectionStart);
  const selectionEnd = Number(value.selectionEnd);
  // stepId is OPTIONAL: a parked idea (a captured span with no move performed
  // yet) has stepId === null. Only id and a valid range are required — so a
  // parked idea survives persistence instead of being dropped for lacking a step.
  if (!id || !Number.isFinite(selectionStart) || !Number.isFinite(selectionEnd)) return null;
  if (selectionStart >= selectionEnd) return null;
  return {
    id,
    selectionStart,
    selectionEnd,
    selectedText: typeof value.selectedText === "string" ? value.selectedText : "",
    source: typeof value.source === "string" ? value.source : "",
    stepId: asString(value.stepId),
    stepTitle: typeof value.stepTitle === "string" ? value.stepTitle : "",
    intent: INTENT_CLASSES.includes(value.intent) ? value.intent : null,
    note: typeof value.note === "string" ? value.note : "",
    move: typeof value.move === "string" ? value.move : "",
    writeBack: value.writeBack === "annotate" ? "annotate" : "replace",
    createdAt: asString(value.createdAt) ?? now,
    resolved: value.resolved === true,
    // Pure visibility toggle: a hidden span's text stays in doc.text; the render
    // layer collapses it. Whitelisted here so a hide survives persistence.
    hidden: value.hidden === true,
    placement: ["appended", "annotated"].includes(value.placement) ? value.placement : "anchored",
    resolvedAt: asString(value.resolvedAt),
  };
}

function normalizeStagedOutput(value) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  const stepId = asString(value.stepId);
  if (!id || !stepId) return null;
  return {
    id,
    stepId,
    annotationId: asString(value.annotationId),
    text: typeof value.text === "string" ? value.text : "",
    at: asString(value.at),
  };
}

function normalizeDraftVersion(value) {
  if (!value || typeof value !== "object") return null;
  const n = Number(value.n);
  if (!Number.isFinite(n) || n < 0) return null;
  return {
    n: Math.floor(n),
    text: typeof value.text === "string" ? value.text : "",
    at: asString(value.at),
  };
}

function normalizeDraftHistoryContribution(value) {
  if (!value || typeof value !== "object") return null;
  return {
    annotationId: asString(value.annotationId),
    stepId: asString(value.stepId) ?? "",
    moveId: asString(value.moveId),
    intent: typeof value.intent === "string" ? value.intent : null,
    tag: typeof value.tag === "string" ? value.tag : null,
    source: typeof value.source === "string" ? value.source : "",
    output: typeof value.output === "string" ? value.output : "",
  };
}

function normalizeDraftHistoryEntry(value) {
  if (!value || typeof value !== "object") return null;
  const n = Number(value.n);
  if (!Number.isFinite(n) || n < 0) return null;
  return {
    n: Math.floor(n),
    text: typeof value.text === "string" ? value.text : "",
    at: asString(value.at),
    contributions: Array.isArray(value.contributions)
      ? value.contributions.map(normalizeDraftHistoryContribution).filter(Boolean)
      : [],
  };
}

function normalizeDoc(value, { now } = {}) {
  if (!value || typeof value !== "object") {
    return { text: "", annotations: [], phase: "stream", frozenText: null, staged: [], versions: [], draftHistory: [] };
  }
  return {
    text: typeof value.text === "string" ? value.text : "",
    annotations: Array.isArray(value.annotations)
      ? value.annotations.map((a) => normalizeThinkPadAnnotation(a, { now })).filter(Boolean)
      : [],
    // Draft phase state machine fields — default-filled for older records that
    // predate the stream-reflect-lifecycle feature. Additive: no schema bump.
    phase: value.phase === "cultivate" ? "cultivate" : "stream",
    frozenText: typeof value.frozenText === "string" ? value.frozenText : null,
    staged: Array.isArray(value.staged)
      ? value.staged.map(normalizeStagedOutput).filter(Boolean)
      : [],
    versions: Array.isArray(value.versions)
      ? value.versions.map(normalizeDraftVersion).filter(Boolean)
      : [],
    draftHistory: Array.isArray(value.draftHistory)
      ? value.draftHistory.map(normalizeDraftHistoryEntry).filter(Boolean)
      : [],
  };
}

/** A thread's back-reference to the parent anchor it resolves into (recursive-resolve). */
function normalizeParentAnchor(value) {
  if (!value || typeof value !== "object") return null;
  const annotationId = asString(value.annotationId);
  if (!annotationId) return null;
  return { annotationId, parentFrameId: asString(value.parentFrameId) };
}

const HISTORY_TYPES = [
  "capture", "promote", "setOutput", "resolve", "complete", "uncomplete", "padEdit", "startScratch",
  // Draft phase rhythm events (stream-reflect-lifecycle)
  "stamp", "reveal", "restream", "advance",
];

function normalizeHistoryEntry(value, { now } = {}) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  const type = HISTORY_TYPES.includes(value.type) ? value.type : null;
  if (!id || !type) return null;
  return {
    id,
    at: asString(value.at) ?? now,
    type,
    stepId: asString(value.stepId),
    annotationId: asString(value.annotationId),
    summary: typeof value.summary === "string" ? value.summary : "",
    meta: value.meta && typeof value.meta === "object" ? value.meta : null,
  };
}

function asString(value, fallback = null) {
  return typeof value === "string" && value ? value : fallback;
}

// ---------------------------------------------------------------------------
// Entity normalizers
// ---------------------------------------------------------------------------

function normalizeStep(value) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!id || !title) return null;
  return {
    id,
    title,
    output: typeof value.output === "string" ? value.output : "",
  };
}

function normalizeThreadArray(arr, { now } = {}) {
  if (!Array.isArray(arr)) return [];
  return arr.map((t) => normalizeThread(t, { now })).filter(Boolean);
}

function normalizeThread(value, { now } = {}) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  if (!id) return null;
  const steps = Array.isArray(value.steps) ? value.steps.map((s) => normalizeStep(s)).filter(Boolean) : [];
  return {
    id,
    steps,
    subThreads: normalizeThreadArray(value.subThreads ?? [], { now }),
    // recursive-resolve: each thread carries its own document surface + a back-ref
    // to the parent anchor it resolves into.
    doc: normalizeDoc(value.doc, { now }),
    parentAnchor: normalizeParentAnchor(value.parentAnchor),
    // isDump distinguishes free-write re-stream threads from anchored move threads.
    isDump: value.isDump === true,
    createdAt: asString(value.createdAt) ?? now,
  };
}

function normalizeNavigationStack(value) {
  const legacyViewId = typeof value.viewThreadId === "string" && value.viewThreadId ? value.viewThreadId : null;
  const legacyViewStack = Array.isArray(value.viewStack)
    ? value.viewStack.map((entry) => (typeof entry === "string" && entry ? entry : null))
    : [];

  if (Array.isArray(value.navigationStack) && value.navigationStack.length > 0) {
    const stack = value.navigationStack.map((entry) =>
      (typeof entry === "string" && entry ? entry : null),
    );
    if (stack[0] !== null) stack.unshift(null);
    const normalized = stack.length ? stack : [null];
    // Default [null] stack coexists with legacy viewThreadId on older records.
    if (normalized.length === 1 && normalized[0] === null && legacyViewId) {
      return [...legacyViewStack, legacyViewId];
    }
    return normalized;
  }
  if (!legacyViewId) return [null];
  return [...legacyViewStack, legacyViewId];
}

export function normalizePad(value, { now } = {}) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  if (!id) return null;
  const threads = normalizeThreadArray(value.threads, { now });
  const inferredState = threads.length === 0
    ? (value.state === "completed" ? "completed" : "new")
    : "active";
  return {
    id,
    title: typeof value.title === "string" ? value.title.trim() : "",
    threads,
    config: normalizeConfig(value.config),
    state: ["new", "active", "completed"].includes(value.state) ? value.state : inferredState,
    createdAt: asString(value.createdAt) ?? now,
    updatedAt: asString(value.updatedAt) ?? now,
    resumeHint: typeof value.resumeHint === "string" ? value.resumeHint : null,
    activeThreadId: typeof value.activeThreadId === "string" && value.activeThreadId ? value.activeThreadId : null,
    navigationStack: normalizeNavigationStack(value),
    doc: normalizeDoc(value.doc, { now }),
    history: Array.isArray(value.history) ? value.history.map((h) => normalizeHistoryEntry(h, { now })).filter(Boolean) : [],
  };
}

// ---------------------------------------------------------------------------
// Top-level normalizer + snapshot builder
// ---------------------------------------------------------------------------

// Public entry: validate + normalize a persisted record. No versioning — a
// record is either a well-formed pad (normalized) or invalid (null).
export function normalizePadRecord(record, { now } = {}) {
  if (!record || typeof record !== "object") return null;
  return normalizePad(record, { now });
}

export function buildPadSnapshot(pad, { now } = {}) {
  if (!pad) return null;
  return normalizePad({ ...pad, updatedAt: now }, { now });
}
