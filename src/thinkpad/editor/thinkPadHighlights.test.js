import { describe, expect, it } from "vitest";
import { computeHighlightSegments, computeGutterMarkers } from "./thinkPadHighlights";

describe("computeHighlightSegments", () => {
  it("returns nothing for empty text", () => {
    expect(computeHighlightSegments("", [])).toEqual([]);
  });

  it("returns a single plain segment when there are no annotations", () => {
    expect(computeHighlightSegments("hello world", [])).toEqual([
      { start: 0, end: 11, kind: "plain" },
    ]);
  });

  it("wraps an anchored span between plain segments", () => {
    // "fix the bug here" — "the bug" is [4,11)
    const segs = computeHighlightSegments("fix the bug here", [
      { selectionStart: 4, selectionEnd: 11, resolved: false },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 4, kind: "plain" },
      { start: 4, end: 11, kind: "anchored", annotationId: null, tag: null },
      { start: 11, end: 16, kind: "plain" },
    ]);
  });

  it("marks resolved spans distinctly", () => {
    const segs = computeHighlightSegments("abcdef", [
      { selectionStart: 0, selectionEnd: 3, resolved: true },
    ]);
    expect(segs[0]).toEqual({ start: 0, end: 3, kind: "resolved", annotationId: null, tag: null });
  });

  it("marks hidden spans distinctly, taking precedence over resolved", () => {
    const segs = computeHighlightSegments("abcdef", [
      { selectionStart: 0, selectionEnd: 3, resolved: true, hidden: true },
    ]);
    expect(segs[0]).toEqual({ start: 0, end: 3, kind: "hidden", annotationId: null, tag: null });
  });

  it("skips an annotation that overlaps an already-emitted span", () => {
    const segs = computeHighlightSegments("0123456789", [
      { selectionStart: 0, selectionEnd: 5, resolved: false },
      { selectionStart: 3, selectionEnd: 8, resolved: false }, // overlaps → skipped
    ]);
    expect(segs).toEqual([
      { start: 0, end: 5, kind: "anchored", annotationId: null, tag: null },
      { start: 5, end: 10, kind: "plain" },
    ]);
  });

  it("clamps offsets that run past the end of the text", () => {
    const segs = computeHighlightSegments("short", [
      { selectionStart: 2, selectionEnd: 999, resolved: false },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 2, kind: "plain" },
      { start: 2, end: 5, kind: "anchored", annotationId: null, tag: null },
    ]);
  });
});

describe("computeGutterMarkers", () => {
  it("reports the starting line of each annotation", () => {
    const text = "line0\nline1\nline2 target";
    const idx = text.indexOf("target");
    const markers = computeGutterMarkers(text, [
      { selectionStart: idx, selectionEnd: idx + 6, stepId: "s1", stepTitle: "do it", resolved: false },
      { selectionStart: 0, selectionEnd: 5, stepId: "s2", stepTitle: "first", resolved: true },
    ]);
    expect(markers).toEqual([
      { stepId: "s2", title: "first", lineIndex: 0, resolved: true },
      { stepId: "s1", title: "do it", lineIndex: 2, resolved: false },
    ]);
  });
});
