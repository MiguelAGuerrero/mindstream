// ---------------------------------------------------------------------------
// Pad persistence mapper — entity-state model: runtime state lives on entities
// and is never derived from an event log.
//
// The app is pre-deployment and keeps NO persisted-format backwards
// compatibility: there is no schema version and no legacy-field tolerance. The
// normalizer validates the current shape and default-fills missing fields; if
// the in-memory model changes, stored records are re-created, not migrated.
//
// Record shape:
//   { id, title, threads, config, state, createdAt, updatedAt, resumeHint,
//     surfaceThreadId, doc }
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
import { ideasFromText, ideasToText } from "./ideas";
import { DISPOSITION_KINDS } from "./thinkPadModel";

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

function normalizeIdea(value) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  if (!id) return null;
  return {
    id,
    text: typeof value.text === "string" ? value.text : "",
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
    ideaId: asString(value.ideaId) ?? asString(value.blockId),
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
    // Open-item gate: the decision taken on an open move (accepted / lifted / parked).
    disposition: normalizeDisposition(value.disposition),
  };
}

/** A decision on an open item (capture-templates-proposal §8.2), or null. */
function normalizeDisposition(value) {
  if (!value || typeof value !== "object") return null;
  if (!DISPOSITION_KINDS.includes(value.kind)) return null;
  return {
    kind: value.kind,
    note: typeof value.note === "string" ? value.note : "",
    target: value.kind === "lifted" ? asString(value.target) : null,
    at: asString(value.at),
  };
}

/** An item lifted into this level from a lower one (capture-templates-proposal §8.2). */
function normalizeLiftedItem(value) {
  if (!value || typeof value !== "object") return null;
  const id = asString(value.id);
  const annotationId = asString(value.from?.annotationId);
  if (!id || !annotationId) return null;
  return {
    id,
    text: typeof value.text === "string" ? value.text : "",
    source: typeof value.source === "string" ? value.source : "",
    from: { padLocator: asString(value.from?.padLocator), annotationId },
    at: asString(value.at),
    disposition: normalizeDisposition(value.disposition),
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
    ideaId: asString(value.ideaId) ?? asString(value.blockId),
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
    ...(value.pass === "stream" ? { pass: "stream" } : {}),
  };
}

function normalizeDoc(value, { now } = {}) {
  if (!value || typeof value !== "object") {
    return {
      text: "", ideas: [], annotations: [], phase: "stream",
      frozenText: null, frozenIdeas: null, staged: [], draftHistory: [], lifted: [],
    };
  }
  const text = typeof value.text === "string" ? value.text : "";
  const legacyBlocks = Array.isArray(value.blocks) ? value.blocks : [];
  let ideas = Array.isArray(value.ideas)
    ? value.ideas.map(normalizeIdea).filter(Boolean)
    : [];
  if (!ideas.length) {
    ideas = legacyBlocks.map(normalizeIdea).filter(Boolean);
  }
  if (!ideas.length && text.trim()) {
    let i = 0;
    ideas = ideasFromText(text, { makeId: () => `idea:legacy-${i++}` });
  }
  const legacyFrozen = Array.isArray(value.frozenBlocks) ? value.frozenBlocks : null;
  const frozenIdeas = Array.isArray(value.frozenIdeas)
    ? value.frozenIdeas.map(normalizeIdea).filter(Boolean)
    : legacyFrozen
      ? legacyFrozen.map(normalizeIdea).filter(Boolean)
      : null;
  return {
    text: ideas.length ? ideasToText(ideas) : text,
    ideas,
    annotations: Array.isArray(value.annotations)
      ? value.annotations.map((a) => normalizeThinkPadAnnotation(a, { now })).filter(Boolean)
      : [],
    phase: value.phase === "cultivate" ? "cultivate" : "stream",
    frozenText: typeof value.frozenText === "string" ? value.frozenText : null,
    frozenIdeas,
    staged: Array.isArray(value.staged)
      ? value.staged.map(normalizeStagedOutput).filter(Boolean)
      : [],
    draftHistory: Array.isArray(value.draftHistory)
      ? value.draftHistory.map(normalizeDraftHistoryEntry).filter(Boolean)
      : [],
    lifted: Array.isArray(value.lifted)
      ? value.lifted.map(normalizeLiftedItem).filter(Boolean)
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
    createdAt: asString(value.createdAt) ?? now,
  };
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
    surfaceThreadId: asString(value.surfaceThreadId),
    doc: normalizeDoc(value.doc, { now }),
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
