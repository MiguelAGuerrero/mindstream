import { describe, expect, it } from "vitest";
import { cleanDecision, cleanStep, cleanSteps, isDecision } from "./steps.js";

describe("cleanStep", () => {
  it("reads strings as titled steps and trims to one line", () => {
    expect(cleanStep("  Reproduce\n it ")).toEqual({ title: "Reproduce it" });
    expect(cleanStep({ title: " Pick " })).toEqual({ title: "Pick" });
  });

  it("keeps a decision with cleaned, de-duplicated options", () => {
    expect(cleanStep({ title: "Pick a fix", decision: { options: [" Pulse ", "", "pulse", "Soft colour", 4] } })).toEqual({
      title: "Pick a fix",
      decision: { options: ["Pulse", "Soft colour"] },
    });
  });

  it("allows a decision with no options (a free answer)", () => {
    expect(cleanStep({ title: "Name the risk", decision: {} })).toEqual({
      title: "Name the risk",
      decision: { options: [] },
    });
  });

  it("is null without a title", () => {
    expect(cleanStep("  ")).toBe(null);
    expect(cleanStep({ decision: { options: ["a"] } })).toBe(null);
    expect(cleanStep(null)).toBe(null);
    expect(cleanStep(7)).toBe(null);
  });
});

describe("cleanSteps / cleanDecision / isDecision", () => {
  it("drops unusable entries and caps the list and the options", () => {
    expect(cleanSteps(["a", "", null, { title: "b" }])).toEqual([{ title: "a" }, { title: "b" }]);
    expect(cleanSteps(Array.from({ length: 20 }, (_, i) => `s${i}`))).toHaveLength(12);
    expect(cleanDecision({ options: Array.from({ length: 9 }, (_, i) => `o${i}`) }).options).toHaveLength(6);
    expect(cleanSteps("nope")).toEqual([]);
  });

  it("isDecision reads the mark", () => {
    expect(isDecision({ title: "x", decision: { options: [] } })).toBe(true);
    expect(isDecision({ title: "x" })).toBe(false);
    expect(isDecision(null)).toBe(false);
  });
});
