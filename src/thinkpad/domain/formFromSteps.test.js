// ThinkPad's way of running a workflow (decisions 13 and 19): as a document.
// Each step's prompt becomes a theme heading you write under.
import { describe, expect, it } from "vitest";
import { formTextFromSteps } from "./formFromSteps";

describe("formTextFromSteps", () => {
  it("writes each prompt as a heading, in order", () => {
    expect(formTextFromSteps([
      { prompt: "State the problem in one sentence.", produces: "text" },
      { prompt: "Why does this matter now?", produces: "text" },
    ])).toBe("# State the problem in one sentence.\n\n# Why does this matter now?");
  });

  it("lists a decision step's options under its heading", () => {
    expect(formTextFromSteps([
      { prompt: "Which split?", produces: "text", expects: "call", options: ["Full body", "Upper/lower"] },
    ])).toBe("# Which split?\n\nChoose: Full body / Upper/lower");
  });

  it("keeps prompts on one line and drops stray heading marks and empty steps", () => {
    expect(formTextFromSteps([{ prompt: "## Two\nlines " }, { prompt: "  " }, null])).toBe("# Two lines");
  });

  it("is empty for no steps", () => {
    expect(formTextFromSteps([])).toBe("");
    expect(formTextFromSteps(null)).toBe("");
  });
});
