import { describe, it, expect } from "vitest";
import { computeBlockActionStates, computeBlockIdeaStates, computeGutterRows, computeNodeRanges } from "./blockActions.js";

describe("computeNodeRanges", () => {
  it("places first node at offset 0", () => {
    const ranges = computeNodeRanges([{ id: "a", text: "hello" }]);
    expect(ranges[0]).toMatchObject({ id: "a", start: 0, end: 5 });
  });
});

describe("computeBlockActionStates", () => {
  it("returns the full drillThread object on drill (not just the id)", () => {
    const blocks = [{ id: "a", text: "Hello" }];
    const annotations = [{ id: "ann1", ideaId: "a", selectionStart: 0, selectionEnd: 5 }];
    const drill = { annotationId: "ann1", threadId: "t1", tag: "expand", title: "Think harder", hasWork: true, completed: false };
    const result = computeBlockActionStates(blocks, annotations, [drill]);
    expect(result[0].drill).toEqual(drill);
  });
});

describe("computeBlockIdeaStates", () => {
  it("maps staged ideas to ideas by ideaId", () => {
    const blocks = [
      { id: "a", text: "Hello world" },
      { id: "b", text: "Second block" },
    ];
    const stagedIdeas = [{ id: "st1", ideaId: "a", stepId: "s1", moveId: "doubt", source: "llo w", text: "staged" }];
    const result = computeBlockIdeaStates(blocks, stagedIdeas);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ nodeId: "a", ideas: [stagedIdeas[0]] });
  });

  it("returns no entries when there are no staged ideas", () => {
    const blocks = [{ id: "a", text: "Hello" }];
    expect(computeBlockIdeaStates(blocks, [])).toEqual([]);
  });

  it("ignores staged ideas without ideaId", () => {
    const blocks = [{ id: "a", text: "Hello" }];
    const stagedIdeas = [{ id: "st1", stepId: "s1", text: "orphan" }];
    expect(computeBlockIdeaStates(blocks, stagedIdeas)).toEqual([]);
  });
});

describe("computeGutterRows", () => {
  it("returns one row per block with staged ideas attached", () => {
    const blocks = [
      { id: "a", text: "Hello world" },
      { id: "b", text: "Second block" },
    ];
    const stagedIdeas = [{ id: "st1", ideaId: "a", stepId: "s1", moveId: "doubt", text: "staged" }];
    const result = computeGutterRows(blocks, stagedIdeas);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ nodeId: "a", ideas: [stagedIdeas[0]] });
    expect(result[1]).toMatchObject({ nodeId: "b", ideas: [] });
  });

  it("returns all blocks with empty ideas when nothing is staged", () => {
    const blocks = [{ id: "a", text: "Hello" }, { id: "b", text: "World" }];
    const result = computeGutterRows(blocks, []);
    expect(result).toHaveLength(2);
    expect(result.every((row) => row.ideas.length === 0)).toBe(true);
  });
});
