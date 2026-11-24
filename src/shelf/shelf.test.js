import { describe, expect, it } from "vitest";
import { addShelfItem, normalizeShelf, removeShelfItem } from "./shelf.js";

describe("shelf", () => {
  it("adds trimmed text, newest first, with where it came from", () => {
    let items = addShelfItem([], { text: "  Rear-foot-elevated split squats?  ", from: "thinkpad" }, { id: "s1", now: "t1" });
    items = addShelfItem(items, { text: "Ask the physio", from: "focus" }, { id: "s2", now: "t2" });
    expect(items).toEqual([
      { id: "s2", text: "Ask the physio", from: "focus", at: "t2" },
      { id: "s1", text: "Rear-foot-elevated split squats?", from: "thinkpad", at: "t1" },
    ]);
  });

  it("ignores empty text, and removes by id (same ref when unknown)", () => {
    const items = addShelfItem([], { text: "x" }, { id: "s1" });
    expect(addShelfItem(items, { text: "   " }, { id: "s2" })).toBe(items);
    expect(removeShelfItem(items, "nope")).toBe(items);
    expect(removeShelfItem(items, "s1")).toEqual([]);
  });

  it("normalizes stored items, dropping anything unusable", () => {
    expect(normalizeShelf([{ id: "a", text: "keep" }, { id: "b", text: " " }, null, { text: "no id" }]))
      .toEqual([{ id: "a", text: "keep", from: null, at: null }]);
    expect(normalizeShelf("nope")).toEqual([]);
  });
});
