import { describe, expect, it } from "vitest";
import { allProduceText, cleanOptions, cleanStep, cleanSteps, isDecision, stepOptions } from "./steps.js";

describe("cleanStep", () => {
  it("reads strings as text-producing prompts and trims to one line", () => {
    expect(cleanStep("  Reproduce\n it ")).toEqual({ prompt: "Reproduce it", produces: "text" });
    expect(cleanStep({ prompt: " Pick ", produces: "action" })).toEqual({ prompt: "Pick", produces: "action" });
    expect(cleanStep({ prompt: "x", produces: "bogus" }).produces).toBe("text");
  });

  it("keeps a call with cleaned, de-duplicated options", () => {
    expect(cleanStep({ prompt: "Pick a fix", expects: "call", options: [" Pulse ", "", "pulse", "Soft colour", 4] })).toEqual({
      prompt: "Pick a fix",
      produces: "text",
      expects: "call",
      options: ["Pulse", "Soft colour"],
    });
  });

  it("allows a call with no options (a free answer)", () => {
    expect(cleanStep({ prompt: "Name the risk", expects: "call" })).toEqual({
      prompt: "Name the risk",
      produces: "text",
      expects: "call",
    });
  });

  it("reads the earlier { title, decision } shape", () => {
    expect(cleanStep({ title: "Pick", decision: { options: ["A", "B"] } })).toEqual({
      prompt: "Pick",
      produces: "text",
      expects: "call",
      options: ["A", "B"],
    });
    expect(cleanStep({ title: "Free", decision: {} })).toEqual({ prompt: "Free", produces: "text", expects: "call" });
    expect(cleanStep({ title: "Plain" })).toEqual({ prompt: "Plain", produces: "text" });
  });

  it("is null without a prompt", () => {
    expect(cleanStep("  ")).toBe(null);
    expect(cleanStep({ expects: "call", options: ["a"] })).toBe(null);
    expect(cleanStep(null)).toBe(null);
    expect(cleanStep(7)).toBe(null);
  });
});

describe("cleanSteps / helpers", () => {
  it("drops unusable entries and caps the list and the options", () => {
    expect(cleanSteps(["a", "", null, { prompt: "b" }]).map((s) => s.prompt)).toEqual(["a", "b"]);
    expect(cleanSteps(Array.from({ length: 20 }, (_, i) => `s${i}`))).toHaveLength(12);
    expect(cleanOptions(Array.from({ length: 9 }, (_, i) => `o${i}`))).toHaveLength(6);
    expect(cleanSteps("nope")).toEqual([]);
  });

  it("reads decisions and their options", () => {
    expect(isDecision({ prompt: "x", expects: "call" })).toBe(true);
    expect(isDecision({ prompt: "x" })).toBe(false);
    expect(isDecision(null)).toBe(false);
    expect(stepOptions({ prompt: "x", expects: "call", options: ["a"] })).toEqual(["a"]);
    expect(stepOptions({ prompt: "x", options: ["a"] })).toEqual([]);
  });

  it("tells whether every step produces text", () => {
    expect(allProduceText([{ prompt: "a", produces: "text" }])).toBe(true);
    expect(allProduceText([{ prompt: "a", produces: "action" }])).toBe(false);
  });
});
