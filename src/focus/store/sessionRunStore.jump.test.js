import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSessionRunStore } from "./sessionRunStore.js";
import { createFocusFrame, nextUndoneStep } from "../model/session.js";

describe("nextUndoneStep", () => {
  it("prefers the next undone step after, then wraps to an earlier one, then reports done", () => {
    expect(nextUndoneStep([true, false, false], 0)).toBe(1);
    expect(nextUndoneStep([false, true, true], 2)).toBe(0);
    expect(nextUndoneStep([true, true, true], 1)).toBe(3);
    expect(nextUndoneStep(undefined, 0)).toBe(0);
  });
});

describe("stepDone on frames", () => {
  it("is all false for a new plan and inferred from stepIndex for old records", () => {
    expect(createFocusFrame({ id: 1, title: "R", steps: ["a", "b"] }).stepDone).toEqual([false, false]);
    expect(createFocusFrame({ id: 1, title: "R", steps: ["a", "b", "c"], stepIndex: 2 }).stepDone).toEqual([
      true,
      true,
      false,
    ]);
    expect(
      createFocusFrame({ id: 1, title: "R", steps: ["a", "b"], stepIndex: 0, stepDone: [false, true] }).stepDone,
    ).toEqual([false, true]);
  });
});

describe("pivoting between steps", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function started() {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    store.planSteps({ steps: ["A", "B", "C"] });
    return store;
  }

  it("jumping from inside a step switches to another without marking the first done", () => {
    const store = started();
    store.jumpToStep({ index: 2 });
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "C"]);
    expect(store.activePlan).toMatchObject({ index: 2, running: true, done: [false, false, false] });
  });

  it("finishing out of order goes on to the remaining steps, then reports all done", () => {
    const store = started();
    store.jumpToStep({ index: 2 });
    store.completeFocus(); // C done → back to A (first undone)
    expect(store.activeFrame.title).toBe("A");
    store.completeFocus(); // A done → B
    expect(store.activeFrame.title).toBe("B");
    store.completeFocus(); // B done → all done
    expect(store.activeFrame.title).toBe("Ship it");
    expect(store.activePlan).toMatchObject({ allDone: true, done: [true, true, true], running: false });
  });

  it("keeps a note from the step you leave", () => {
    const store = started();
    store.reflectOnFocus({ text: "A half explored" });
    store.jumpToStep({ index: 1 });
    expect(store.activePlan.results[0]).toBe("A half explored");
  });

  it("closes a sub-focus drilled below the step, and works from the plan holder", () => {
    const store = started();
    store.drillIntoFocus({ title: "detail" });
    store.jumpToStep({ index: 1 });
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "B"]);
    store.abandonFocus();
    store.jumpToStep({ index: 2 });
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "C"]);
  });

  it("ignores bad indexes, the current step, and contexts with no plan", () => {
    const store = started();
    store.jumpToStep({ index: 0 });
    store.jumpToStep({ index: 9 });
    store.jumpToStep({ index: -1 });
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "A"]);
    const plain = useSessionRunStore();
    plain.newContext({ title: "No plan" });
    plain.jumpToStep({ index: 0 });
    expect(plain.activeStack).toHaveLength(1);
  });
});
