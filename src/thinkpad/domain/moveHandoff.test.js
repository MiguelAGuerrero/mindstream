import { describe, expect, it } from "vitest";
import { moveToRequest } from "./moveHandoff.js";

const thread = (title) => ({ steps: [{ title }] });

describe("moveToRequest", () => {
  it("uses the step title as text and the selected span as context", () => {
    expect(moveToRequest({ thread: thread("Define scope"), annotation: { selectedText: "the launch plan" } })).toEqual({
      text: "Define scope",
      context: ["the launch plan"],
    });
  });

  it("omits context when identical to the text", () => {
    expect(moveToRequest({ thread: thread("Same"), annotation: { selectedText: " Same " } })).toEqual({ text: "Same", context: [] });
  });

  it("works without an annotation", () => {
    expect(moveToRequest({ thread: thread("Solo") })).toEqual({ text: "Solo", context: [] });
  });

  it("falls back to the selected text for a blank title", () => {
    expect(moveToRequest({ thread: thread("  "), annotation: { selectedText: "picked" } })).toEqual({ text: "picked", context: [] });
  });

  it("returns null when nothing usable exists", () => {
    expect(moveToRequest({ thread: thread(""), annotation: { selectedText: " " } })).toBe(null);
    expect(moveToRequest({})).toBe(null);
    expect(moveToRequest()).toBe(null);
  });

  it("collapses multiline text to one line", () => {
    expect(moveToRequest({ thread: thread("A\n  B"), annotation: { selectedText: "x\ny\n\nz" } })).toEqual({
      text: "A B",
      context: ["x y z"],
    });
  });

  it("truncates a long span with an ellipsis", () => {
    const body = moveToRequest({ thread: thread("T"), annotation: { selectedText: "a".repeat(500) } });
    expect(body.context[0].length).toBe(280);
    expect(body.context[0].endsWith("…")).toBe(true);
  });
});
