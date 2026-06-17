import { describe, expect, it } from "vitest";
import { parseBlocks } from "./ideaParser";

describe("parseBlocks", () => {
  it("returns empty array for empty / non-string input", () => {
    expect(parseBlocks("")).toEqual([]);
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks(undefined)).toEqual([]);
  });

  it("returns a single block for text with no blank lines", () => {
    const blocks = parseBlocks("Hello world");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ start: 0, end: 11, text: "Hello world" });
  });

  it("splits on blank lines into multiple blocks", () => {
    const blocks = parseBlocks("First\n\nSecond");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ start: 0, end: 5, text: "First" });
    expect(blocks[1]).toMatchObject({ start: 7, end: 13, text: "Second" });
  });

  it("every block has a string id prefixed with 'b'", () => {
    for (const b of parseBlocks("Alpha\n\nBeta\n\nGamma")) {
      expect(typeof b.id).toBe("string");
      expect(b.id.startsWith("b")).toBe(true);
    }
  });

  it("id is stable — same text always produces the same id", () => {
    const a = parseBlocks("Hello world");
    const b = parseBlocks("Hello world");
    expect(a[0].id).toBe(b[0].id);
  });

  it("ids are unique across blocks in the same document", () => {
    const blocks = parseBlocks("Alpha\n\nBeta\n\nGamma");
    const ids = blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("different content produces different ids", () => {
    const [a] = parseBlocks("First block");
    const [b] = parseBlocks("Second block");
    expect(a.id).not.toBe(b.id);
  });

  it("preserves char offsets — slice(start, end) === text", () => {
    const text = "Hello world\n\nSecond paragraph\n\nThird";
    for (const b of parseBlocks(text)) {
      expect(text.slice(b.start, b.end)).toBe(b.text);
    }
  });

  it("preserves internal single newlines within a block", () => {
    const text = "Line one\nLine two\n\nNext block";
    const blocks = parseBlocks(text);
    expect(blocks[0].text).toBe("Line one\nLine two");
    expect(blocks[1].text).toBe("Next block");
  });

  it("skips whitespace-only blocks", () => {
    const text = "First\n\n   \n\nSecond";
    expect(parseBlocks(text)).toHaveLength(2);
    expect(parseBlocks(text)[0].text).toBe("First");
    expect(parseBlocks(text)[1].text).toBe("Second");
  });

  it("handles multiple consecutive blank lines as a single separator", () => {
    const blocks = parseBlocks("First\n\n\n\nSecond");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe("First");
    expect(blocks[1].text).toBe("Second");
  });

  it("handles leading and trailing newlines gracefully", () => {
    const blocks = parseBlocks("\n\nOnly block\n\n");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ start: 2, end: 12, text: "Only block" });
  });

  it("handles three or more blocks", () => {
    const text = "A\n\nB\n\nC";
    const blocks = parseBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks.map((b) => b.text)).toEqual(["A", "B", "C"]);
    for (const b of blocks) {
      expect(text.slice(b.start, b.end)).toBe(b.text);
    }
  });
});
