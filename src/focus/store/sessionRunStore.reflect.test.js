import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSessionRunStore } from "./sessionRunStore.js";
import { createFocusFrame, normalizeContextRecord, createContext } from "../model/session.js";

describe("reflection is opt-in and kept", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("reflectOnFocus sets and clears a note without completing", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.reflectOnFocus({ text: "  noticed X  " });
    expect(store.currentResult).toBe("noticed X");
    expect(store.currentResolved).toBe(false);
    store.reflectOnFocus({ text: "" });
    expect(store.currentResult).toBe(null);
  });

  it("a step's reflection survives completing it, on the plan", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    store.planSteps({ steps: ["A", "B"] });
    store.reflectOnFocus({ text: "A was easy" });
    store.completeFocus({ result: store.currentResult });
    expect(store.activeFrame.title).toBe("B");
    expect(store.activePlan.results).toEqual(["A was easy"]);
    store.completeFocus();
    expect(store.activePlan).toMatchObject({ index: 2, running: false, results: ["A was easy"] });
  });

  it("completing a step without a reflection records nothing", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    store.planSteps({ steps: ["A", "B"] });
    store.completeFocus();
    expect(store.activePlan.results).toEqual([]);
  });

  it("stepResults round-trip and are dropped when empty", () => {
    const root = createFocusFrame({ id: 1, title: "R", steps: ["a", "b"], stepIndex: 1, stepResults: ["did a"] });
    expect(root.stepResults).toEqual(["did a", ""]);
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(createContext({ id: 2, rootFrame: root }))));
    expect(revived.stack[0].stepResults).toEqual(["did a", ""]);
    expect(createFocusFrame({ id: 3, title: "R", steps: ["a"], stepResults: [""] }).stepResults).toBeUndefined();
  });
});
