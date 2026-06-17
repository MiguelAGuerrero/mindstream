// ---------------------------------------------------------------------------
// idClock — the imperative shell's effect capabilities.
//
// The functional core (src/domain/*) is 100% pure: it never calls `new Date()`,
// `Date.now()`, or `Math.random()`, and owns no mutable module counters. Every
// id and timestamp it needs is an INPUT, supplied by the caller. This module is
// where those effects actually live, so the shell (the Pinia store) can mint a
// timestamp / id generator and thread them into the pure reducers.
//
//   - makeId(prefix): a stateful generator. Successive calls yield distinct ids
//     even within a single tick. The module counter guarantees uniqueness within
//     a session; the Date.now() segment keeps ids distinct across sessions.
//   - nowIso(): the current wall-clock instant as an ISO-8601 string.
// ---------------------------------------------------------------------------

let __seq = 0;

export function makeId(prefix) {
  __seq += 1;
  return `${prefix}:${Date.now().toString(36)}:${__seq.toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
