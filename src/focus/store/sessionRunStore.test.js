import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSessionRunStore } from "./sessionRunStore.js";

describe("sessionRunStore (contexts of authored focuses)", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("starts with no contexts", () => {
    const store = useSessionRunStore();
    expect(store.hasContexts).toBe(false);
    expect(store.hasFocus).toBe(false);
    expect(store.activeContext).toBe(null);
    expect(store.currentFocus).toBe("");
    expect(store.contextList).toEqual([]);
  });

  it("newContext authors a problem and makes it active", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "  Ship the runner  " });
    expect(store.hasContexts).toBe(true);
    expect(store.hasFocus).toBe(true);
    expect(store.currentFocus).toBe("Ship the runner");
    expect(store.breadcrumb).toEqual(["Ship the runner"]);
    expect(store.contextList).toHaveLength(1);
    expect(store.contextList[0]).toMatchObject({ problem: "Ship the runner", isActive: true, parked: false });
  });

  it("ignores a blank problem", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "   " });
    expect(store.hasContexts).toBe(false);
  });

  it("holds multiple isolated contexts; the latest is active", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Problem A" });
    store.newContext({ title: "Problem B" });
    expect(store.contextList.map((c) => c.problem)).toEqual(["Problem A", "Problem B"]);
    expect(store.currentFocus).toBe("Problem B");
    expect(store.contextList.find((c) => c.problem === "Problem B").isActive).toBe(true);
  });

  it("decompose/resolve act only on the ACTIVE context's stack", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const aId = store.activeContextId;
    store.newContext({ title: "B" });
    // drill within B
    store.drillIntoFocus({ title: "B.1" });
    expect(store.depth).toBe(2);
    expect(store.breadcrumb).toEqual(["B", "B.1"]);
    // A is untouched
    const a = store.contextList.find((c) => c.id === aId);
    expect(a.depth).toBe(1);
    // resolve B.1 with a takeaway folds into B
    store.resolveFocus({ result: "  done B.1  " });
    expect(store.depth).toBe(1);
    expect(store.currentResult).toBe("done B.1");
  });

  it("switchContext activates another context and clears its parked state", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const aId = store.activeContextId;
    store.newContext({ title: "B" });
    store.parkActiveContext({ reason: "waiting on review" }); // parks B, deactivates
    expect(store.hasFocus).toBe(false);
    store.switchContext(aId);
    expect(store.currentFocus).toBe("A");
    store.switchContext(store.contextList.find((c) => c.problem === "B").id);
    const b = store.contextList.find((c) => c.problem === "B");
    expect(b.isActive).toBe(true);
    expect(b.parked).toBe(false); // resuming un-parks
    expect(b.waitingOn).toBe("");
  });

  it("parkActiveContext records the reason and sets the context aside", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.parkActiveContext({ reason: "  waiting on code review  " });
    expect(store.hasFocus).toBe(false);
    expect(store.activeContextId).toBe(null);
    const a = store.contextList[0];
    expect(a.parked).toBe(true);
    expect(a.waitingOn).toBe("waiting on code review"); // trimmed
  });

  it("parks with no reason (still set aside)", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.parkActiveContext();
    expect(store.contextList[0]).toMatchObject({ parked: true, waitingOn: "" });
    expect(store.hasFocus).toBe(false);
  });

  it("deactivate steps off without parking or removing", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.deactivate();
    expect(store.hasFocus).toBe(false);
    expect(store.hasContexts).toBe(true);
    expect(store.contextList[0].parked).toBe(false);
  });

  it("endActiveContext removes the active context", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.newContext({ title: "B" });
    store.endActiveContext(); // ends B
    expect(store.contextList.map((c) => c.problem)).toEqual(["A"]);
    expect(store.hasFocus).toBe(false);
  });

  it("guards: drill/resolve/park no-op with no active context", () => {
    const store = useSessionRunStore();
    store.drillIntoFocus({ title: "x" });
    store.resolveFocus({ result: "x" });
    store.parkActiveContext({ reason: "x" });
    store.endActiveContext();
    expect(store.hasContexts).toBe(false);
  });
});
