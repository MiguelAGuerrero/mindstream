// ---------------------------------------------------------------------------
// Handoff model — a small explicit message from one tool to another, created
// by a visible user action. Shape:
//   { id, createdAt, from:{tool, ref}, to:{tool, intent, ref?},
//     task:{title, notes?, suggestedMinutes?, steps?},
//     result:{status, minutes, reflection?, output?:{text?, items?}}, consumedAt }
// `steps` and `items` are lists of steps (see steps.js).
// Tools never read each other's state; they only exchange these.
//
// Pure data: no Vue, no store, no persistence. Effects (id, time) are passed
// in by the caller so the model stays trivially unit-testable.
// ---------------------------------------------------------------------------
import { getAcceptedIntent, getTool } from "./toolRegistry.js";
import { cleanSteps } from "./steps.js";

const RESULT_STATUSES = ["completed", "abandoned"];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPositiveNumber(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

const MAX_TEXT_LENGTH = 1000;

/**
 * What a target hands back: `{ text? }` (one note) and/or `{ items? }` (an
 * ordered list of steps, see steps.js). Blank entries are dropped and sizes
 * capped. Null when nothing usable remains.
 */
export function normalizeOutput(output) {
  if (!output || typeof output !== "object") return null;
  const out = {};
  const noteText = text(output.text).slice(0, MAX_TEXT_LENGTH);
  if (noteText) out.text = noteText;
  if (Array.isArray(output.items)) {
    const items = cleanSteps(output.items);
    if (items.length) out.items = items;
  }
  return out.text || out.items ? out : null;
}

function cleanTask(task) {
  if (!task || typeof task !== "object") return null;
  const title = text(task.title);
  if (!title) return null;
  const out = { title };
  const notes = text(task.notes);
  if (notes) out.notes = notes;
  if (isPositiveNumber(task.suggestedMinutes)) out.suggestedMinutes = task.suggestedMinutes;
  // An ordered plan to start with or to save (e.g. "run this workflow").
  const steps = cleanSteps(task.steps);
  if (steps.length) out.steps = steps;
  return out;
}

/**
 * Validate and build a handoff, or null when it can't be delivered: blank
 * source, unknown target, intent the target does not accept, or no task title.
 */
export function createHandoff({ from, to, task } = {}, { id, now } = {}) {
  const fromTool = text(from?.tool);
  const fromRef = text(from?.ref);
  if (!fromTool || !fromRef) return null;
  const toTool = text(to?.tool);
  const intent = text(to?.intent);
  if (!getTool(toTool) || !getAcceptedIntent(toTool, intent)) return null;
  const cleaned = cleanTask(task);
  if (!cleaned) return null;
  if (typeof id !== "string" || !id) return null;
  return {
    id,
    createdAt: typeof now === "string" ? now : null,
    from: { tool: fromTool, ref: fromRef },
    to: { tool: toTool, intent },
    task: cleaned,
    result: null,
    consumedAt: null,
  };
}

/**
 * Validate a result: status completed|abandoned, minutes a finite number >= 0,
 * optional one-line reflection. Null when unusable.
 */
export function normalizeResult(result) {
  if (!result || typeof result !== "object") return null;
  if (!RESULT_STATUSES.includes(result.status)) return null;
  const minutes = result.minutes;
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) return null;
  const out = { status: result.status, minutes };
  const reflection = typeof result.reflection === "string" ? result.reflection.replace(/\s+/g, " ").trim() : "";
  if (reflection) out.reflection = reflection;
  const output = normalizeOutput(result.output);
  if (output) out.output = output;
  return out;
}

/** Revive a stored record into a canonical handoff, or null when malformed. */
export function normalizeHandoffRecord(record) {
  if (!record || typeof record !== "object") return null;
  const base = createHandoff(record, { id: text(record.id), now: record.createdAt });
  if (!base) return null;
  // Where the target put the work (e.g. a pad id), bound after it consumes the handoff.
  const targetRef = text(record.to?.ref);
  if (targetRef) base.to.ref = targetRef;
  base.result = normalizeResult(record.result);
  base.consumedAt = typeof record.consumedAt === "string" && record.consumedAt ? record.consumedAt : null;
  return base;
}

/**
 * Aggregate results across handoffs: `{sessions, minutes, completed,
 * lastReflection}`, or null when none has a result.
 */
export function summarizeResults(handoffs) {
  const withResult = (Array.isArray(handoffs) ? handoffs : []).filter((h) => h?.result);
  if (!withResult.length) return null;
  const sorted = [...withResult].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  const reflections = sorted.map((h) => h.result.reflection).filter(Boolean);
  return {
    sessions: withResult.length,
    minutes: withResult.reduce((sum, h) => sum + h.result.minutes, 0),
    completed: withResult.filter((h) => h.result.status === "completed").length,
    lastReflection: reflections.length ? reflections[reflections.length - 1] : "",
  };
}
