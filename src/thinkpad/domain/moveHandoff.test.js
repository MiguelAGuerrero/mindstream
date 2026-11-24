import { describe, expect, it } from "vitest";
import { moveToFocusTask } from "./moveHandoff.js";

const thread = (title) => ({ steps: [{ title }] });

describe("moveToFocusTask", () => {
  it("uses the step title and the selected text as notes", () => {
    expect(moveToFocusTask({ thread: thread("Define scope"), annotation: { selectedText: "the launch plan" } })).toEqual({
      title: "Define scope",
      notes: "the launch plan",
    });
  });

  it("omits notes when identical to the title", () => {
    expect(moveToFocusTask({ thread: thread("Same"), annotation: { selectedText: " Same " } })).toEqual({ title: "Same" });
  });

  it("works without an annotation", () => {
    expect(moveToFocusTask({ thread: thread("Solo") })).toEqual({ title: "Solo" });
  });

  it("falls back to the selected text for a blank title", () => {
    expect(moveToFocusTask({ thread: thread("  "), annotation: { selectedText: "picked" } })).toEqual({ title: "picked" });
  });

  it("returns null when nothing usable exists", () => {
    expect(moveToFocusTask({ thread: thread(""), annotation: { selectedText: " " } })).toBe(null);
    expect(moveToFocusTask({})).toBe(null);
    expect(moveToFocusTask()).toBe(null);
  });

  it("collapses multiline text to one line", () => {
    expect(moveToFocusTask({ thread: thread("A\n  B"), annotation: { selectedText: "x\ny\n\nz" } })).toEqual({
      title: "A B",
      notes: "x y z",
    });
  });

  it("truncates long notes with an ellipsis", () => {
    const task = moveToFocusTask({ thread: thread("T"), annotation: { selectedText: "a".repeat(500) } });
    expect(task.notes.length).toBe(280);
    expect(task.notes.endsWith("…")).toBe(true);
  });

  it("never sets a duration", () => {
    expect(moveToFocusTask({ thread: thread("T") })).not.toHaveProperty("suggestedMinutes");
  });
});
