import { describe, expect, it } from "vitest";
import { charToPos, posToChar, textToDocJSON, docJSONToText, textToInlineJSON, docJSONToNodes } from "./thinkPadDoc";

describe("char ↔ pos adapters", () => {
  it("maps char offset to PM position with a constant +1", () => {
    expect(charToPos(0)).toBe(1);
    expect(charToPos(5)).toBe(6);
  });

  it("is an exact inverse", () => {
    for (const c of [0, 1, 7, 42]) expect(posToChar(charToPos(c))).toBe(c);
  });

  it("clamps junk input", () => {
    expect(charToPos(undefined)).toBe(1);
    expect(posToChar(undefined)).toBe(0);
    expect(posToChar(0)).toBe(0); // never negative
  });
});

describe("textToDocJSON", () => {
  it("empty string → a single empty paragraph", () => {
    expect(textToDocJSON("")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("plain text → one paragraph with one text node", () => {
    expect(textToDocJSON("hello")).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
    });
  });

  it("single \\n within a paragraph → HardBreak (no new paragraph)", () => {
    expect(textToDocJSON("a\nb")).toEqual({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }],
      }],
    });
  });

  it("a bare newline is a lone HardBreak (no illegal empty text node)", () => {
    expect(textToDocJSON("\n")).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "hardBreak" }] }],
    });
  });

  it("\\n\\n splits into two paragraph nodes", () => {
    expect(textToDocJSON("first\n\nsecond")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "first" }] },
        { type: "paragraph", content: [{ type: "text", text: "second" }] },
      ],
    });
  });

  it("three or more consecutive newlines also split paragraphs", () => {
    const result = textToDocJSON("a\n\n\nb");
    expect(result.content).toHaveLength(2);
    expect(result.content[0].content).toEqual([{ type: "text", text: "a" }]);
    expect(result.content[1].content).toEqual([{ type: "text", text: "b" }]);
  });
});

describe("textToInlineJSON (paste / partial insert)", () => {
  it("turns every newline into a HardBreak, never an empty text node", () => {
    expect(textToInlineJSON("a\nb\n\nc")).toEqual([
      { type: "text", text: "a" },
      { type: "hardBreak" },
      { type: "text", text: "b" },
      { type: "hardBreak" },
      { type: "hardBreak" },
      { type: "text", text: "c" },
    ]);
  });

  it("empty string yields no inline nodes", () => {
    expect(textToInlineJSON("")).toEqual([]);
  });
});

describe("docJSONToText", () => {
  it("reconstructs text and newlines within a paragraph", () => {
    expect(docJSONToText(textToDocJSON("a\nb"))).toBe("a\nb");
  });

  it("joins multiple paragraph nodes with \\n\\n", () => {
    const json = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "one" }] },
        { type: "paragraph", content: [{ type: "text", text: "two" }] },
      ],
    };
    expect(docJSONToText(json)).toBe("one\n\ntwo");
  });
});

describe("docJSONToNodes", () => {
  it("extracts id and text from paragraphs that have an attrs.id", () => {
    const json = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { id: "n1" }, content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph", attrs: { id: "n2" }, content: [{ type: "text", text: "World" }] },
      ],
    };
    expect(docJSONToNodes(json)).toEqual([
      { id: "n1", text: "Hello" },
      { id: "n2", text: "World" },
    ]);
  });

  it("omits paragraphs without an id", () => {
    const json = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { id: "n1" }, content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    };
    expect(docJSONToNodes(json)).toEqual([{ id: "n1", text: "A" }]);
  });

  it("preserves HardBreak as \\n within the node text", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { id: "n1" },
          content: [{ type: "text", text: "line one" }, { type: "hardBreak" }, { type: "text", text: "line two" }],
        },
      ],
    };
    expect(docJSONToNodes(json)).toEqual([{ id: "n1", text: "line one\nline two" }]);
  });

  it("returns empty array for empty or invalid input", () => {
    expect(docJSONToNodes(null)).toEqual([]);
    expect(docJSONToNodes({ type: "doc", content: [] })).toEqual([]);
  });
});

describe("round-trip: text → JSON → text is identity", () => {
  for (const s of [
    "",
    "hello world",
    "a\nb",
    "\n",
    "\nleading",
    "trailing\n",
    "two\n\nblanks",
    "The cache layer is the real bottleneck\nNetwork latency dominates.",
  ]) {
    it(JSON.stringify(s), () => {
      expect(docJSONToText(textToDocJSON(s))).toBe(s);
    });
  }
});
