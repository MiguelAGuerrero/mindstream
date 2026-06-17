// ---------------------------------------------------------------------------
// Test kit for the pure domain core.
//
// The domain functions are pure: they take `now` (an ISO string) and `makeId`
// (a prefix → id generator) as inputs instead of reading the clock or minting
// ids themselves. Direct-domain tests use this helper to supply deterministic
// versions of those capabilities, so assertions on timestamps and ids are
// reproducible.
//
// makeTestEnv() returns a FRESH environment each call: a fixed `now` and a brand
// new counter-backed `makeId`, so ids start at 1 within each test.
// ---------------------------------------------------------------------------

export const FIXED_NOW = "2026-01-01T00:00:00.000Z";

export function makeTestEnv() {
  let n = 0;
  return {
    now: FIXED_NOW,
    makeId: (prefix) => `${prefix}:${++n}`,
  };
}
