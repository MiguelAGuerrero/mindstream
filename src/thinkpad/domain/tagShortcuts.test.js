import { describe, expect, it } from "vitest";
import { normalizeTagShortcuts, setTagShortcut, clearTagShortcut } from "./tagShortcuts";

const doubt = { label: "Doubt it", steps: [{ prompt: "What would make this false?" }, { prompt: "  " }] };

describe("tag shortcuts", () => {
  it("declares one workflow per tag, keeping a copy of its steps", () => {
    const map = setTagShortcut({}, "question", doubt);
    expect(map).toEqual({ question: { label: "Doubt it", steps: [{ prompt: "What would make this false?", produces: "text" }] } });
  });

  it("replaces the shortcut for the same tag and keeps the others", () => {
    let map = setTagShortcut({}, "question", doubt);
    map = setTagShortcut(map, "expand", { label: "Branch", steps: [{ prompt: "What else could follow?" }] });
    map = setTagShortcut(map, "question", { label: "Steelman", steps: [{ prompt: "Make the best case." }] });
    expect(Object.keys(map).sort()).toEqual(["expand", "question"]);
    expect(map.question.label).toBe("Steelman");
  });

  it("ignores unknown tags and empty workflows (same ref)", () => {
    const map = setTagShortcut({}, "question", doubt);
    expect(setTagShortcut(map, "nope", doubt)).toBe(map);
    expect(setTagShortcut(map, "expand", { label: "x", steps: [] })).toBe(map);
    expect(setTagShortcut(map, "question", doubt)).toBe(map); // unchanged
  });

  it("clears a tag's shortcut", () => {
    const map = setTagShortcut({}, "question", doubt);
    expect(clearTagShortcut(map, "question")).toEqual({});
    expect(clearTagShortcut({}, "question")).toEqual({});
  });

  it("normalizes stored data, dropping anything unusable", () => {
    expect(normalizeTagShortcuts({ question: doubt, expand: { label: "", steps: [{ prompt: "x" }] }, bogus: doubt, converge: "x" }))
      .toEqual({ question: { label: "Doubt it", steps: [{ prompt: "What would make this false?", produces: "text" }] } });
    expect(normalizeTagShortcuts(null)).toEqual({});
  });
});
