// The runner's open loops (roadmap Phase 4): contexts not yet resolved, each
// with its one next step. Parked ones say what they wait on and since when.
import { describe, expect, it } from "vitest";
import { createContext, createFocusFrame } from "./session.js";
import { openLoopsForContexts } from "./openLoops.js";

function ctx(id, titles, extra = {}) {
  const c = createContext({ id, rootFrame: createFocusFrame({ id: `${id}:0`, title: titles[0] }) });
  c.stack = titles.map((t, i) => createFocusFrame({ id: `${id}:${i}`, title: t }));
  return Object.assign(c, extra);
}

describe("openLoopsForContexts", () => {
  it("lists live and parked contexts, not resolved ones", () => {
    const loops = openLoopsForContexts([
      ctx("a", ["Build my program", "Pick a split"]),
      ctx("b", ["Book a physio"], { parked: true, waitingOn: "a reply from the clinic", parkedAt: "2026-11-17T10:00:00.000Z" }),
      ctx("c", ["Done thing"], { resolved: true }),
    ]);
    expect(loops).toEqual([
      expect.objectContaining({ tool: "focus", title: "Build my program", next: "Continue: Pick a split", place: { context: "a" } }),
      expect.objectContaining({ tool: "focus", title: "Book a physio", next: "Waiting on a reply from the clinic", since: "2026-11-17T10:00:00.000Z", place: { context: "b" } }),
    ]);
  });

  it("says Parked when no reason was given, and Continue on the problem itself at the root", () => {
    const loops = openLoopsForContexts([ctx("a", ["Solo"]), ctx("b", ["Later"], { parked: true })]);
    expect(loops.map((l) => l.next)).toEqual(["Continue: Solo", "Parked"]);
  });

  it("is empty for none", () => {
    expect(openLoopsForContexts([])).toEqual([]);
    expect(openLoopsForContexts(null)).toEqual([]);
  });
});

import { normalizeContextRecord } from "./session.js";

describe("parkedAt persistence", () => {
  it("keeps when a context was parked, and only while it is parked", () => {
    const base = { id: "a", stack: [{ id: "a:0", title: "Book a physio" }], parked: true, parkedAt: "2026-11-17T10:00:00.000Z" };
    expect(normalizeContextRecord(base).parkedAt).toBe("2026-11-17T10:00:00.000Z");
    expect(normalizeContextRecord({ ...base, parked: false }).parkedAt).toBeUndefined();
  });
});
