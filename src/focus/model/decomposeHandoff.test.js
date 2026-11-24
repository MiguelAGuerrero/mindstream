import { describe, expect, it } from "vitest";
import { focusToRequest, stepsFromReply, stepsFromText } from "./decomposeHandoff.js";

const p = (...prompts) => prompts.map((prompt) => ({ prompt, produces: "text" }));

describe("focusToRequest", () => {
  it("uses the focus as text and the ancestors as context, outermost first", () => {
    expect(
      focusToRequest({
        focus: "  Ship the timer UI change ",
        breadcrumb: ["Mindstream", "Fix timer bug", "Ship the timer UI change"],
      }),
    ).toEqual({ text: "Ship the timer UI change", context: ["Mindstream", "Fix timer bug"] });
  });

  it("has empty context at the root", () => {
    expect(focusToRequest({ focus: "Ship it", breadcrumb: ["Ship it"] })).toEqual({ text: "Ship it", context: [] });
    expect(focusToRequest({ focus: "Ship it" })).toEqual({ text: "Ship it", context: [] });
  });

  it("is null without usable focus text", () => {
    expect(focusToRequest({ focus: "   " })).toBe(null);
    expect(focusToRequest()).toBe(null);
  });
});

describe("stepsFromReply", () => {
  it("returns the reply's steps, keeping calls", () => {
    const steps = [{ prompt: "Pick a fix", expects: "call", options: ["Pulse", "Colour"] }, "Write it"];
    expect(stepsFromReply({ steps })).toEqual([
      { prompt: "Pick a fix", produces: "text", expects: "call", options: ["Pulse", "Colour"] },
      { prompt: "Write it", produces: "text" },
    ]);
  });

  it("falls back to lines of text with list markers removed", () => {
    expect(stepsFromReply({ text: "1. First\n- second\n  * third\n\nplain" })).toEqual(p("First", "second", "third", "plain"));
  });

  it("prefers steps over text, and caps the list", () => {
    expect(stepsFromReply({ steps: ["a"], text: "b" })).toEqual(p("a"));
    expect(stepsFromReply({ steps: Array.from({ length: 20 }, (_, i) => `s${i}`) })).toHaveLength(12);
  });

  it("is empty when there is nothing to step through", () => {
    expect(stepsFromReply(null)).toEqual([]);
    expect(stepsFromReply({ outcome: "resolved" })).toEqual([]);
  });
});

describe("stepsFromText", () => {
  it("makes one step per non-empty line, markers optional", () => {
    expect(stepsFromText("1. one\n\n- two\nthree")).toEqual(p("one", "two", "three"));
  });

  it("treats a single line as one step and blanks as none", () => {
    expect(stepsFromText("just one thing")).toEqual(p("just one thing"));
    expect(stepsFromText("  \n ")).toEqual([]);
    expect(stepsFromText(undefined)).toEqual([]);
  });
});
