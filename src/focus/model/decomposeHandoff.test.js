import { describe, expect, it } from "vitest";
import { focusToDecomposeTask, stepsFromText, subFocusesFromResult } from "./decomposeHandoff.js";

describe("focusToDecomposeTask", () => {
  it("uses the focus as the title and the ancestors as notes", () => {
    expect(
      focusToDecomposeTask({
        focus: "  Ship the timer UI change ",
        breadcrumb: ["Mindstream", "Fix timer bug", "Ship the timer UI change"],
      }),
    ).toEqual({ title: "Ship the timer UI change", notes: "Mindstream › Fix timer bug" });
  });

  it("omits notes at the root", () => {
    expect(focusToDecomposeTask({ focus: "Ship it", breadcrumb: ["Ship it"] })).toEqual({ title: "Ship it" });
    expect(focusToDecomposeTask({ focus: "Ship it" })).toEqual({ title: "Ship it" });
  });

  it("caps long ancestor chains", () => {
    const long = "x".repeat(400);
    const task = focusToDecomposeTask({ focus: "T", breadcrumb: [long, "T"] });
    expect(task.notes.length).toBe(280);
    expect(task.notes.endsWith("…")).toBe(true);
  });

  it("is null without usable focus text", () => {
    expect(focusToDecomposeTask({ focus: "   " })).toBe(null);
    expect(focusToDecomposeTask()).toBe(null);
  });
});

const t = (...titles) => titles.map((title) => ({ title }));

describe("subFocusesFromResult", () => {
  it("returns items as steps, cleaned", () => {
    expect(subFocusesFromResult({ output: { items: ["  List the states ", "", "Sketch expiry"] } })).toEqual(
      t("List the states", "Sketch expiry"),
    );
  });

  it("keeps decisions on returned steps", () => {
    const items = [{ title: "Pick a fix", decision: { options: ["Pulse", "Colour"] } }, "Write it"];
    expect(subFocusesFromResult({ output: { items } })).toEqual([
      { title: "Pick a fix", decision: { options: ["Pulse", "Colour"] } },
      { title: "Write it" },
    ]);
  });

  it("falls back to lines of text with list markers removed", () => {
    expect(subFocusesFromResult({ output: { text: "1. First\n- second\n  * third\n\nplain" } })).toEqual(
      t("First", "second", "third", "plain"),
    );
  });

  it("prefers items over text, and caps the list", () => {
    expect(subFocusesFromResult({ output: { items: ["a"], text: "b" } })).toEqual(t("a"));
    const many = Array.from({ length: 20 }, (_, i) => `s${i}`);
    expect(subFocusesFromResult({ output: { items: many } })).toHaveLength(12);
  });

  it("is empty when there is no output", () => {
    expect(subFocusesFromResult(null)).toEqual([]);
    expect(subFocusesFromResult({ status: "completed" })).toEqual([]);
    expect(subFocusesFromResult({ output: {} })).toEqual([]);
  });
});

describe("stepsFromText", () => {
  it("makes one step per non-empty line, markers optional", () => {
    expect(stepsFromText("1. one\n\n- two\nthree")).toEqual(t("one", "two", "three"));
  });

  it("treats a single line as one step and blanks as none", () => {
    expect(stepsFromText("just one thing")).toEqual(t("just one thing"));
    expect(stepsFromText("  \n ")).toEqual([]);
    expect(stepsFromText(undefined)).toEqual([]);
  });
});