import { describe, expect, it } from "vitest";
import {
  ideasToText,
  ideasFromText,
  syncIdeasFromNodes,
  reconcileIdeasFromText,
  ensureDocIdeas,
  ideaRanges,
  ideaIdForRange,
  docHasMultipleIdeas,
  readDocIdeas,
  readFrozenIdeas,
  parseIdeasFromText,
  parseBlocks,
} from "./ideas";

const makeId = (prefix) => `${prefix}:1`;

describe("ideas model", () => {
  it("ideasToText joins with blank lines", () => {
    expect(ideasToText([
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ])).toBe("First\n\nSecond");
  });

  it("ideasFromText mints stable-shape ideas", () => {
    const ideas = ideasFromText("Alpha\n\nBeta", { makeId });
    expect(ideas).toHaveLength(2);
    expect(ideas[0].id).toBe("idea:1");
    expect(ideas.map((i) => i.text)).toEqual(["Alpha", "Beta"]);
  });

  it("syncIdeasFromNodes preserves ids and updates text", () => {
    const existing = [{ id: "n1", text: "old" }];
    const next = syncIdeasFromNodes(existing, [{ id: "n1", text: "new" }], { makeId });
    expect(next).toEqual([{ id: "n1", text: "new" }]);
  });

  it("reconcileIdeasFromText preserves ids by index", () => {
    const existing = [{ id: "b1", text: "A" }, { id: "b2", text: "B" }];
    const next = reconcileIdeasFromText(existing, "A\n\nB\n\nC", { makeId });
    expect(next[0].id).toBe("b1");
    expect(next[1].id).toBe("b2");
    expect(next[2].id).toBe("idea:1");
  });

  it("ensureDocIdeas back-fills from text", () => {
    const doc = ensureDocIdeas({ text: "One\n\nTwo" }, { makeId });
    expect(doc.ideas).toHaveLength(2);
    expect(doc.text).toBe("One\n\nTwo");
  });

  it("ensureDocIdeas migrates legacy doc.blocks", () => {
    const doc = ensureDocIdeas({
      blocks: [{ id: "a", text: "One" }, { id: "b", text: "Two" }],
    }, { makeId });
    expect(doc.ideas).toHaveLength(2);
    expect(doc.ideas[0].id).toBe("a");
  });

  it("readDocIdeas prefers ideas over legacy blocks", () => {
    expect(readDocIdeas({
      ideas: [{ id: "i1", text: "A" }],
      blocks: [{ id: "b1", text: "B" }],
    }).map((i) => i.id)).toEqual(["i1"]);
  });

  it("readDocIdeas falls back to legacy blocks", () => {
    expect(readDocIdeas({
      ideas: [],
      blocks: [{ id: "b1", text: "B" }],
    }).map((i) => i.id)).toEqual(["b1"]);
  });

  it("ideaRanges matches slice offsets", () => {
    const text = ideasToText([{ id: "a", text: "Hello" }, { id: "b", text: "World" }]);
    const ranges = ideaRanges([{ id: "a", text: "Hello" }, { id: "b", text: "World" }]);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe("Hello");
    expect(text.slice(ranges[1].start, ranges[1].end)).toBe("World");
  });

  it("ideaIdForRange finds the owning idea", () => {
    const ideas = [{ id: "a", text: "Hello world" }];
    const ranges = ideaRanges(ideas);
    expect(ideaIdForRange(ideas, ranges[0].start + 2, ranges[0].start + 7)).toBe("a");
  });

  it("docHasMultipleIdeas reads ideas array", () => {
    expect(docHasMultipleIdeas({ ideas: [{ id: "a", text: "x" }] })).toBe(false);
    expect(docHasMultipleIdeas({
      ideas: [{ id: "a", text: "x" }, { id: "b", text: "y" }],
    })).toBe(true);
  });
});

describe("parseIdeasFromText", () => {
  it("returns empty array for empty / non-string input", () => {
    expect(parseIdeasFromText("")).toEqual([]);
    expect(parseIdeasFromText(null)).toEqual([]);
    expect(parseIdeasFromText(undefined)).toEqual([]);
  });

  it("returns a single idea for text with no blank lines", () => {
    const ideas = parseIdeasFromText("Hello world");
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ start: 0, end: 11, text: "Hello world" });
  });

  it("splits on blank lines into multiple ideas", () => {
    const ideas = parseIdeasFromText("First\n\nSecond");
    expect(ideas).toHaveLength(2);
    expect(ideas[0]).toMatchObject({ start: 0, end: 5, text: "First" });
    expect(ideas[1]).toMatchObject({ start: 7, end: 13, text: "Second" });
  });

  it("every idea has a string id prefixed with 'b'", () => {
    for (const i of parseIdeasFromText("Alpha\n\nBeta\n\nGamma")) {
      expect(typeof i.id).toBe("string");
      expect(i.id.startsWith("b")).toBe(true);
    }
  });

  it("id is stable — same text always produces the same id", () => {
    const a = parseIdeasFromText("Hello world");
    const b = parseIdeasFromText("Hello world");
    expect(a[0].id).toBe(b[0].id);
  });

  it("ids are unique across ideas in the same document", () => {
    const ideas = parseIdeasFromText("Alpha\n\nBeta\n\nGamma");
    const ids = ideas.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("different content produces different ids", () => {
    const [a] = parseIdeasFromText("First block");
    const [b] = parseIdeasFromText("Second block");
    expect(a.id).not.toBe(b.id);
  });

  it("preserves char offsets — slice(start, end) === text", () => {
    const text = "Hello world\n\nSecond paragraph\n\nThird";
    for (const i of parseIdeasFromText(text)) {
      expect(text.slice(i.start, i.end)).toBe(i.text);
    }
  });

  it("preserves internal single newlines within an idea", () => {
    const text = "Line one\nLine two\n\nNext block";
    const ideas = parseIdeasFromText(text);
    expect(ideas[0].text).toBe("Line one\nLine two");
    expect(ideas[1].text).toBe("Next block");
  });

  it("skips whitespace-only ideas", () => {
    const text = "First\n\n   \n\nSecond";
    expect(parseIdeasFromText(text)).toHaveLength(2);
    expect(parseIdeasFromText(text)[0].text).toBe("First");
    expect(parseIdeasFromText(text)[1].text).toBe("Second");
  });

  it("handles multiple consecutive blank lines as a single separator", () => {
    const ideas = parseIdeasFromText("First\n\n\n\nSecond");
    expect(ideas).toHaveLength(2);
    expect(ideas[0].text).toBe("First");
    expect(ideas[1].text).toBe("Second");
  });

  it("handles leading and trailing newlines gracefully", () => {
    const ideas = parseIdeasFromText("\n\nOnly block\n\n");
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ start: 2, end: 12, text: "Only block" });
  });

  it("handles three or more ideas", () => {
    const text = "A\n\nB\n\nC";
    const ideas = parseIdeasFromText(text);
    expect(ideas).toHaveLength(3);
    expect(ideas.map((i) => i.text)).toEqual(["A", "B", "C"]);
    for (const i of ideas) {
      expect(text.slice(i.start, i.end)).toBe(i.text);
    }
  });

  it("parseBlocks is an alias for parseIdeasFromText", () => {
    expect(parseBlocks("A\n\nB")).toEqual(parseIdeasFromText("A\n\nB"));
  });
});
