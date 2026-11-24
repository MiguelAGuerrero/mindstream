import { describe, expect, it } from "vitest";
import {
  MOVES,
  MOVE_FAMILIES,
  INTENT_CLASSES,
  WRITE_BACK,
  getMoveById,
  getStanceDisplay,
  movesForIntent,
  movesByFamily,
} from "./moves";

describe("MOVES table", () => {
  it("is the agreed Core 6 + Extended 3 set", () => {
    expect(MOVES).toHaveLength(9);
  });

  it("includes the three anchor moves the design started from", () => {
    const ids = MOVES.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["clarify", "doubt", "experiment"]));
  });

  it("has unique ids", () => {
    const ids = MOVES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every move the fields the three seams consume", () => {
    for (const m of MOVES) {
      expect(typeof m.id).toBe("string");
      expect(m.label, m.id).toBeTruthy();
      expect(m.icon, m.id).toMatch(/^mdi-/);
      expect(m.hint, m.id).toBeTruthy();
      expect(m.prompt, m.id).toBeTruthy();
      expect(Array.isArray(m.answers), m.id).toBe(true);
      expect(m.answers.length, m.id).toBeGreaterThan(0);
    }
  });

  it("uses only valid write-back modes", () => {
    const modes = new Set(Object.values(WRITE_BACK));
    for (const m of MOVES) expect(modes.has(m.writeBack), m.id).toBe(true);
  });

  it("only convergent moves replace text; perspective moves annotate", () => {
    const replacers = MOVES.filter((m) => m.writeBack === WRITE_BACK.REPLACE).map((m) => m.id);
    expect(replacers.sort()).toEqual(["clarify", "resolve"]);
  });

  it("references only declared families", () => {
    const families = new Set(MOVE_FAMILIES.map((f) => f.id));
    for (const m of MOVES) expect(families.has(m.family), m.id).toBe(true);
  });

  it("answers only canonical intent classes", () => {
    for (const m of MOVES) {
      for (const intent of m.answers) {
        expect(INTENT_CLASSES.includes(intent), `${m.id} → ${intent}`).toBe(true);
      }
    }
  });

  it("escalates to a workflow name string or null", () => {
    for (const m of MOVES) {
      expect(m.escalatesTo === null || typeof m.escalatesTo === "string", m.id).toBe(true);
    }
  });
});

describe("getMoveById", () => {
  it("finds a known move", () => {
    expect(getMoveById("doubt")?.label).toBe("Doubt");
  });

  it("returns null for an unknown id", () => {
    expect(getMoveById("nope")).toBeNull();
  });
});

describe("movesForIntent", () => {
  it("offers both Doubt and Support for a CLAIM (the Claim→Support/Question pair)", () => {
    const ids = movesForIntent("CLAIM").map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["doubt", "support"]));
  });

  it("preserves display order", () => {
    const ids = movesForIntent("CLAIM").map((m) => m.id);
    const order = MOVES.map((m) => m.id);
    const sorted = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    expect(ids).toEqual(sorted);
  });

  it("returns nothing for an unknown intent", () => {
    expect(movesForIntent("BOGUS")).toEqual([]);
  });
});

describe("movesByFamily", () => {
  it("buckets every move under exactly one family, losing none", () => {
    const grouped = movesByFamily();
    expect(grouped.map((g) => g.family.id)).toEqual(MOVE_FAMILIES.map((f) => f.id));
    const total = grouped.reduce((n, g) => n + g.moves.length, 0);
    expect(total).toBe(MOVES.length);
  });
});

describe("getStanceDisplay", () => {
  it("prefers a specific move id over the annotation tag", () => {
    expect(getStanceDisplay({ moveId: "doubt", tag: "expand" }).label).toBe("Doubt");
  });

  it("falls back to tag labels when no move is set", () => {
    expect(getStanceDisplay({ tag: "expand" }).label).toBe("Expand");
    expect(getStanceDisplay({ tag: "converge" }).label).toBe("Resolve");
    expect(getStanceDisplay({ tag: "question" }).label).toBe("Question");
  });

  it("defaults to Focus when neither move nor tag is known", () => {
    expect(getStanceDisplay().label).toBe("Focus");
  });
});
