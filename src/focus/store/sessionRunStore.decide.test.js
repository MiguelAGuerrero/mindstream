import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSessionRunStore } from "./sessionRunStore.js";
import { createContext, createFocusFrame, normalizeContextRecord } from "../model/session.js";

describe("decision steps", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function started() {
    const store = useSessionRunStore();
    store.newContext({ title: "Fix the timer" });
    store.planSteps({
      steps: [
        "Sketch two fixes",
        { prompt: "Pick a fix", expects: "call", options: ["Pulse", "Soft colour"] },
        { prompt: "Name the main risk", expects: "call" },
        "Write it",
      ],
    });
    return store;
  }

  it("exposes the running step's decision, and none on plain steps", () => {
    const store = started();
    expect(store.activePlan.decision).toBe(null);
    store.resolveFocus();
    expect(store.activeFrame.title).toBe("Pick a fix");
    expect(store.activePlan.decision).toEqual({ options: ["Pulse", "Soft colour"] });
  });

  it("choosing an option records it and moves on", () => {
    const store = started();
    store.resolveFocus();
    store.decideStep({ choice: "Pulse" });
    expect(store.activeFrame.title).toBe("Name the main risk");
    expect(store.activePlan.choices[1]).toBe("Pulse");
    expect(store.activePlan.done).toEqual([true, true, false, false]);
  });

  it("rejects a choice outside fixed options, and blanks", () => {
    const store = started();
    store.resolveFocus();
    store.decideStep({ choice: "Something else" });
    store.decideStep({ choice: "   " });
    expect(store.activeFrame.title).toBe("Pick a fix");
    expect(store.activePlan.choices).toEqual([]);
  });

  it("a decision without options takes a free answer, and keeps a reflection separately", () => {
    const store = started();
    store.resolveFocus();
    store.decideStep({ choice: "Pulse" });
    store.reflectOnFocus({ text: "worried about second monitors" });
    store.decideStep({ choice: "  Missed on a second monitor " });
    expect(store.activeFrame.title).toBe("Write it");
    expect(store.activePlan.choices[2]).toBe("Missed on a second monitor");
    expect(store.activePlan.results[2]).toBe("worried about second monitors");
  });

  it("is a no-op on a plain step or outside a plan", () => {
    const store = started();
    store.decideStep({ choice: "Pulse" });
    expect(store.activeFrame.title).toBe("Sketch two fixes");
    const plain = useSessionRunStore();
    plain.newContext({ title: "No plan" });
    plain.decideStep({ choice: "x" });
    expect(plain.activeStack).toHaveLength(1);
  });

  it("decisions and choices survive persistence", () => {
    const root = createFocusFrame({
      id: 1,
      title: "R",
      steps: [{ prompt: "Pick", expects: "call", options: ["a", "b"] }],
      stepChoices: ["a"],
    });
    const revived = normalizeContextRecord(JSON.parse(JSON.stringify(createContext({ id: 2, rootFrame: root }))));
    expect(revived.stack[0].steps).toEqual([{ prompt: "Pick", produces: "text", expects: "call", options: ["a", "b"] }]);
    expect(revived.stack[0].stepChoices).toEqual(["a"]);
  });
});
