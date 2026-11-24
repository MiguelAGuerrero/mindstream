// ---------------------------------------------------------------------------
// Focus-runner model — AUTHORED units of attention, grouped into CONTEXTS.
//
// You don't pick a prescribed workflow; you author what you're focusing on. A
// "frame" is one authored focus (a sticky note). The only move is to DECOMPOSE
// it — drilling pushes a child focus you also author — so recursion lives in a
// STACK of frames, not in nested fields.
//
// A "context" is one isolated problem: its own stack (root focus + drilled
// decompositions). The runner holds many contexts and switches between them by
// clicking — typically when the current one is blocked / awaiting something
// outside the user's control (captured as `waitingOn`).
//
// Pure data: no Vue, no store, no persistence. Effects (id, timestamp) are
// passed in by the caller so the model stays trivially unit-testable.
// ---------------------------------------------------------------------------
import { cleanSteps, MAX_STEPS } from "../../handoff/steps.js";

/**
 * One authored focus.
 * @param {object} args
 * @param {number|string} args.id        unique id (minted by the caller)
 * @param {string}        args.title     the authored focus text (the prompt itself)
 * @param {string|null}   args.result    takeaway folded up when a decomposed child resolves
 * @param {string|null}   args.createdAt ISO timestamp (minted by the caller)
 * @param {Array}         args.steps     an ordered plan of steps ({title, decision?}) (optional)
 * @param {number}        args.stepIndex which step is current or next; `steps.length` means all done
 * @param {boolean[]}     args.stepDone  which steps are done, by index
 * @param {number}        args.fromStep  when this frame IS a step of its parent's plan, which one
 */
export function createFocusFrame({
  id,
  title = "",
  result = null,
  createdAt = null,
  steps,
  stepIndex,
  fromStep,
  stepResults,
  stepDone,
  stepChoices,
  planTag,
} = {}) {
  const frame = {
    id,
    title: typeof title === "string" ? title : "",
    result: result ?? null,
    createdAt,
  };
  // Plan fields exist only when set, so a plain frame keeps its small shape.
  const plan = cleanSteps(steps);
  if (plan.length) {
    frame.steps = plan;
    const at = Number.isInteger(stepIndex) ? stepIndex : 0;
    frame.stepIndex = Math.min(Math.max(at, 0), plan.length);
    // Which steps are done, by index. Steps can be done out of order (you can
    // jump), so this is tracked per step. Older records without it are read as
    // "everything before stepIndex is done", which is what they meant.
    frame.stepDone = plan.map((_, i) =>
      Array.isArray(stepDone) ? stepDone[i] === true : i < frame.stepIndex,
    );
  }
  if (Number.isInteger(fromStep) && fromStep >= 0) frame.fromStep = fromStep;
  // Reflections recorded on steps, and the outputs chosen on decision steps,
  // both by step index ("" = none). Dropped entirely when empty.
  const byStep = (values) => {
    if (!plan.length || !Array.isArray(values)) return null;
    const kept = plan.map((_, i) => (typeof values[i] === "string" ? values[i].trim() : ""));
    return kept.some(Boolean) ? kept : null;
  };
  const results = byStep(stepResults);
  if (results) frame.stepResults = results;
  const choices = byStep(stepChoices);
  if (choices) frame.stepChoices = choices;
  // Opaque tag the plan's steps arrived with (roadmap §4.2), kept for comparing runs.
  if (plan.length && typeof planTag === "string" && planTag) frame.planTag = planTag;
  return frame;
}

/**
 * The step to work on after `from` finishes: the next undone step after it,
 * else the first undone step before it, else `steps.length` (all done).
 */
export function nextUndoneStep(stepDone, from) {
  const done = Array.isArray(stepDone) ? stepDone : [];
  for (let i = from + 1; i < done.length; i++) if (!done[i]) return i;
  for (let i = 0; i < Math.min(from, done.length); i++) if (!done[i]) return i;
  return done.length;
}

// Plan steps are the shared step shape ({ title, decision? }); older records
// stored bare strings, which cleanSteps reads as { title }.
export { cleanSteps, MAX_STEPS };

/**
 * One isolated problem you can switch to — its own drillable focus stack.
 * `parked` + `waitingOn` record that it's set aside awaiting something external.
 * @param {object} args
 * @param {number|string} args.id        unique id (minted by the caller)
 * @param {object|null}   args.rootFrame the seeding focus frame (the problem)
 * @param {string|null}   args.createdAt ISO timestamp (minted by the caller)
 */
export function createContext({
  id,
  rootFrame = null,
  createdAt = null,
  notes = "",
  origin = null,
  handoffId = null,
} = {}) {
  return {
    id,
    stack: rootFrame ? [rootFrame] : [],
    parked: false,
    waitingOn: "",
    resolved: false,
    createdAt,
    // Optional task context from a handoff: one read-only line of notes, a
    // back-reference to the source ({tool, ref}), the handoff id to report the
    // result to, and seconds spent (banked each time the timer resets).
    notes: typeof notes === "string" ? notes : "",
    origin: normalizeOrigin(origin),
    handoffId: typeof handoffId === "string" && handoffId ? handoffId : null,
    spentSeconds: 0,
    // The id of a handoff this context sent out (e.g. "decompose in ThinkPad")
    // and is still waiting on. Persisted so the wait survives navigation/reload.
    awaitingHandoffId: null,
  };
}

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== "object") return null;
  if (typeof origin.tool !== "string" || !origin.tool) return null;
  if (typeof origin.ref !== "string" || !origin.ref) return null;
  return { tool: origin.tool, ref: origin.ref };
}

/** "m:ss" — time spent on the current focus. */
export function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function isValidId(id) {
  return Number.isFinite(id) || (typeof id === "string" && id.trim().length > 0);
}

/**
 * Revive a persisted context record into a canonical context, or null when
 * the record is unusable (no id, no valid root frame). Malformed frames are
 * dropped; a context that loses its root is dropped whole. Read path only —
 * the write path persists live contexts, which are canonical by construction.
 */
export function normalizeContextRecord(record) {
  if (!record || typeof record !== "object") return null;
  if (!isValidId(record.id)) return null;

  const rawStack = Array.isArray(record.stack) ? record.stack : [];
  const stack = [];
  for (const frame of rawStack) {
    if (!frame || typeof frame !== "object") continue;
    if (!isValidId(frame.id)) continue;
    if (typeof frame.title !== "string" || !frame.title.trim()) continue;
    stack.push(
      createFocusFrame({
        id: frame.id,
        title: frame.title,
        result: typeof frame.result === "string" ? frame.result : null,
        createdAt: typeof frame.createdAt === "string" ? frame.createdAt : null,
        steps: frame.steps,
        stepIndex: frame.stepIndex,
        fromStep: frame.fromStep,
        stepResults: frame.stepResults,
        stepDone: frame.stepDone,
        stepChoices: frame.stepChoices,
        planTag: frame.planTag,
      }),
    );
  }
  if (stack.length === 0) return null;

  const context = createContext({
    id: record.id,
    rootFrame: stack[0],
    createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
  });
  context.stack = stack;
  context.parked = record.parked === true;
  context.waitingOn = typeof record.waitingOn === "string" ? record.waitingOn : "";
  context.resolved = record.resolved === true;
  context.notes = typeof record.notes === "string" ? record.notes : "";
  context.origin = normalizeOrigin(record.origin);
  context.handoffId = typeof record.handoffId === "string" && record.handoffId ? record.handoffId : null;
  const spent = record.spentSeconds;
  context.spentSeconds = typeof spent === "number" && Number.isFinite(spent) && spent > 0 ? spent : 0;
  context.awaitingHandoffId =
    typeof record.awaitingHandoffId === "string" && record.awaitingHandoffId ? record.awaitingHandoffId : null;
  return context;
}
