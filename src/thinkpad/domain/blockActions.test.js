import { describe, it, expect } from "vitest";
import { computeBlockActionStates, computeNodeRanges } from "./blockActions.js";

describe("computeNodeRanges", () => {
  it("places first node at offset 0", () => {
    const ranges = computeNodeRanges([{ id: "a", text: "hello" }]);
    expect(ranges[0]).toMatchObject({ id: "a", start: 0, end: 5 });
  });

  it("separates nodes by 2 (\\n\\n)", () => {
    const ranges = computeNodeRanges([
      { id: "a", text: "hello" },
      { id: "b", text: "world" },
    ]);
    expect(ranges[1]).toMatchObject({ id: "b", start: 7, end: 12 });
  });

  it("returns empty array for no nodes", () => {
    expect(computeNodeRanges([])).toEqual([]);
    expect(computeNodeRanges(null)).toEqual([]);
  });
});

describe("computeBlockActionStates", () => {
  it("returns one entry per non-empty node with no drill when no annotations", () => {
    const nodes = [
      { id: "a", text: "Hello world" },
      { id: "b", text: "Second block" },
    ];
    const result = computeBlockActionStates(nodes, [], []);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ nodeId: "a", text: "Hello world", drill: null });
    expect(result[1]).toMatchObject({ nodeId: "b", text: "Second block", drill: null });
  });

  it("includes start/end char ranges in output", () => {
    const nodes = [
      { id: "a", text: "Hello" },
      { id: "b", text: "World" },
    ];
    const result = computeBlockActionStates(nodes, [], []);
    expect(result[0]).toMatchObject({ start: 0, end: 5 });
    expect(result[1]).toMatchObject({ start: 7, end: 12 });
  });

  it("maps a drill thread to the block containing its annotation", () => {
    // "a" occupies chars 0–11; "b" chars 13–25 (+2 for \n\n)
    const nodes = [
      { id: "a", text: "Hello world" },
      { id: "b", text: "Second block" },
    ];
    const annotations = [{ id: "ann1", selectionStart: 2, selectionEnd: 7 }];
    const drillThreads = [{ annotationId: "ann1", threadId: "t1", tag: "question", title: "Hello" }];
    const result = computeBlockActionStates(nodes, annotations, drillThreads);
    expect(result[0].drill).toMatchObject({ annotationId: "ann1", threadId: "t1", tag: "question" });
    expect(result[1].drill).toBeNull();
  });

  it("does not match annotations that span outside block boundaries", () => {
    // "a": 0–5, "b": 7–12
    const nodes = [{ id: "a", text: "Hello" }, { id: "b", text: "World" }];
    // Annotation starts in "a" but ends past its boundary
    const annotations = [{ id: "ann1", selectionStart: 3, selectionEnd: 9 }];
    const drillThreads = [{ annotationId: "ann1", threadId: "t1" }];
    const result = computeBlockActionStates(nodes, annotations, drillThreads);
    expect(result[0].drill).toBeNull(); // ann1.end (9) > block "a" end (5)
    expect(result[1].drill).toBeNull(); // ann1.start (3) < block "b" start (7)
  });

  it("excludes empty and whitespace-only blocks", () => {
    const nodes = [
      { id: "a", text: "Hello" },
      { id: "b", text: "" },
      { id: "c", text: "   " },
      { id: "d", text: "World" },
    ];
    const result = computeBlockActionStates(nodes, [], []);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.nodeId)).toEqual(["a", "d"]);
  });

  it("excludes hidden marker annotations from drill matching", () => {
    const nodes = [{ id: "a", text: "Hello world" }];
    const annotations = [{ id: "ann1", selectionStart: 0, selectionEnd: 5, hidden: true }];
    const drillThreads = [{ annotationId: "ann1", threadId: "t1" }];
    const result = computeBlockActionStates(nodes, annotations, drillThreads);
    expect(result[0].drill).toBeNull();
  });

  it("returns the full drillThread object on drill (not just the id)", () => {
    const nodes = [{ id: "a", text: "Hello" }];
    const annotations = [{ id: "ann1", selectionStart: 0, selectionEnd: 5 }];
    const drill = { annotationId: "ann1", threadId: "t1", tag: "expand", title: "Think harder", hasWork: true, completed: false };
    const result = computeBlockActionStates(nodes, annotations, [drill]);
    expect(result[0].drill).toEqual(drill);
  });

  it("handles null/undefined inputs gracefully", () => {
    expect(computeBlockActionStates(null, null, null)).toEqual([]);
    expect(computeBlockActionStates([], null, null)).toEqual([]);
  });
});
