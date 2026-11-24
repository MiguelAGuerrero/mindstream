import { describe, expect, it } from "vitest";
import { itemsFromDraft, itemsFromPadText } from "./decomposeReturn.js";

describe("itemsFromPadText", () => {
  it("takes only list-looking lines", () => {
    const text = [
      "I keep going back and forth on how to show the expiry.",
      "1. List the states the timer can be in",
      "2) Sketch expiry for each",
      "- Pick one",
      "More prose here.",
      "• Write the change",
    ].join("\n");
    expect(itemsFromPadText(text)).toEqual([
      "List the states the timer can be in",
      "Sketch expiry for each",
      "Pick one",
      "Write the change",
    ]);
  });

  it("returns nothing for prose, blanks, or junk", () => {
    expect(itemsFromPadText("just thinking out loud\nno list at all")).toEqual([]);
    expect(itemsFromPadText("")).toEqual([]);
    expect(itemsFromPadText(null)).toEqual([]);
  });

  it("caps the list", () => {
    const text = Array.from({ length: 20 }, (_, i) => `${i + 1}. step ${i + 1}`).join("\n");
    expect(itemsFromPadText(text)).toHaveLength(12);
  });
});

describe("itemsFromDraft", () => {
  it("takes one step per non-empty line, markers optional", () => {
    expect(itemsFromDraft("1. first\n\n  second  \n- third")).toEqual(["first", "second", "third"]);
  });

  it("is empty for blank or non-string input", () => {
    expect(itemsFromDraft("   \n  ")).toEqual([]);
    expect(itemsFromDraft(undefined)).toEqual([]);
  });
});
