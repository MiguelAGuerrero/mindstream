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

/**
 * One authored focus.
 * @param {object} args
 * @param {number|string} args.id        unique id (minted by the caller)
 * @param {string}        args.title     the authored focus text (the prompt itself)
 * @param {string|null}   args.result    takeaway folded up when a decomposed child completes
 * @param {string|null}   args.createdAt ISO timestamp (minted by the caller)
 */
export function createFocusFrame({ id, title = "", result = null, createdAt = null } = {}) {
  return {
    id,
    title: typeof title === "string" ? title : "",
    result: result ?? null,
    createdAt,
  };
}

/**
 * One isolated problem you can switch to — its own drillable focus stack.
 * `parked` + `waitingOn` record that it's set aside awaiting something external.
 * @param {object} args
 * @param {number|string} args.id        unique id (minted by the caller)
 * @param {object|null}   args.rootFrame the seeding focus frame (the problem)
 * @param {string|null}   args.createdAt ISO timestamp (minted by the caller)
 */
export function createContext({ id, rootFrame = null, createdAt = null } = {}) {
  return {
    id,
    stack: rootFrame ? [rootFrame] : [],
    parked: false,
    waitingOn: "",
    createdAt,
  };
}

/** "m:ss" — time spent on the current focus. */
export function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
