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

  it("resolve at root records a takeaway and steps off the resolved context", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship the runner" });
    store.resolveFocus({ result: "  shipped it  " });
    // The problem itself carries the takeaway; the context survives as a record.
    expect(store.contexts[0].stack[0].result).toBe("shipped it");
    expect(store.contextList[0]).toMatchObject({ resolved: true, result: "shipped it" });
    // Completing the root finishes the run — nothing is active afterwards.
    expect(store.hasFocus).toBe(false);
    expect(store.activeContextId).toBe(null);
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
    // complete B.1 pops the stack; result is NOT rolled up to B
    store.resolveFocus({ result: "  done B.1  " });
    expect(store.depth).toBe(1);
    expect(store.currentFocus).toBe("B");
    expect(store.currentResult).toBeNull();
  });

  it("switchContext un-parks but KEEPS waitingOn as the re-entry cue", () => {
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
    expect(b.waitingOn).toBe("waiting on review"); // the cue survives resume
  });

  it("clearWaitingOn dismisses the re-entry cue", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const aId = store.activeContextId;
    store.parkActiveContext({ reason: "waiting on legal" });
    store.switchContext(aId);
    store.clearWaitingOn({ id: aId });
    expect(store.contextList[0].waitingOn).toBe("");
    store.clearWaitingOn({ id: 999 }); // unknown id is a no-op
  });

  it("endActiveContext leaves survivors untouched", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.parkActiveContext({ reason: "blocked on API" }); // parks A
    store.newContext({ title: "B" });
    store.endActiveContext(); // ends B and steps off — A is not promoted
    const a = store.contextList[0];
    expect(store.hasFocus).toBe(false);
    expect(a.isActive).toBe(false);
    expect(a.parked).toBe(true); // closing B must not un-park A
    expect(a.waitingOn).toBe("blocked on API");
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

  it("endActiveContext removes the active context and steps off, even when others remain", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.newContext({ title: "B" });
    store.endActiveContext(); // ends B
    expect(store.contextList.map((c) => c.problem)).toEqual(["A"]);
    expect(store.hasFocus).toBe(false);
    expect(store.activeContextId).toBe(null);
  });

  it("resolve at root steps off even when another live context exists", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.newContext({ title: "B" });
    store.resolveFocus({ result: "done B" }); // B resolved; must NOT hop to A
    expect(store.hasFocus).toBe(false);
    expect(store.activeContextId).toBe(null);
    expect(store.contextList.find((c) => c.problem === "A").resolved).toBe(false);
  });

  it("endActiveContext clears focus when the last context is removed", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.endActiveContext();
    expect(store.hasContexts).toBe(false);
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

describe("contextBoard (stack-view columns)", () => {
  beforeEach(() => setActivePinia(createPinia()));

  /** Board columns identify themselves by their root problem. */
  const titles = (store) => store.contextBoard.map((c) => c.cards[0].title);

  it("is empty with no contexts", () => {
    expect(useSessionRunStore().contextBoard).toEqual([]);
  });

  it("projects a depth-1 context as a single active card", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship the runner" });
    expect(store.contextBoard).toHaveLength(1);
    expect(store.contextBoard[0]).toMatchObject({ state: "live", depth: 1, isActive: true });
    expect(store.contextBoard[0].cards).toHaveLength(1);
    // The root IS the active frame at depth 1 — no special case in the deck.
    expect(store.contextBoard[0].cards[0]).toMatchObject({
      title: "Ship the runner",
      result: null,
      depthIndex: 0,
      isActive: true,
    });
  });

  it("orders cards root → active, with exactly one active card at the end", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.drillIntoFocus({ title: "A.1" });
    store.drillIntoFocus({ title: "A.1.1" });
    const { cards } = store.contextBoard[0];
    // Pins the render direction: index 0 draws at the TOP of the column.
    expect(cards.map((c) => c.title)).toEqual(["A", "A.1", "A.1.1"]);
    expect(cards.map((c) => c.depthIndex)).toEqual([0, 1, 2]);
    expect(cards.filter((c) => c.isActive)).toHaveLength(1);
    expect(cards[cards.length - 1].isActive).toBe(true);
  });

  it("shortens the deck on resolve without rolling up the result", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.drillIntoFocus({ title: "A.1" });
    store.resolveFocus({ result: "  learned it  " });
    const { cards } = store.contextBoard[0];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ title: "A", result: null, isActive: true });
  });

  it("orders columns live → parked → resolved regardless of creation order", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.resolveFocus({ result: "done A" }); // A resolved
    store.newContext({ title: "B" });
    store.parkActiveContext({ reason: "blocked" }); // B parked
    store.newContext({ title: "C" }); // C live
    // Created A, B, C — the board reverses them entirely.
    expect(titles(store)).toEqual(["C", "B", "A"]);
    expect(store.contextBoard.map((c) => c.state)).toEqual(["live", "parked", "resolved"]);
  });

  it("keeps creation order within a band (stable sort)", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.newContext({ title: "B" });
    store.newContext({ title: "C" });
    expect(titles(store)).toEqual(["A", "B", "C"]);
    const bId = store.contextBoard.find((c) => c.cards[0].title === "B").id;
    store.switchContext(bId);
    store.parkActiveContext();
    // Only B moves; A and C hold their relative order.
    expect(titles(store)).toEqual(["A", "C", "B"]);
  });

  it("treats a resolved context as resolved even if it is also parked", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.contexts[0].parked = true;
    store.contexts[0].resolved = true;
    expect(store.contextBoard[0].state).toBe("resolved");
  });

  it("does NOT reorder store state when sorting", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.resolveFocus({ result: "done A" });
    store.newContext({ title: "B" });
    const before = store.contexts.map((c) => c.id);
    expect(titles(store)).toEqual(["B", "A"]); // the sort really does flip them
    expect(store.contexts.map((c) => c.id)).toEqual(before);
  });

  it("tracks the active context and clears it on deactivate", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.newContext({ title: "B" });
    expect(store.contextBoard.filter((c) => c.isActive).map((c) => c.cards[0].title)).toEqual(["B"]);
    store.deactivate();
    expect(store.contextBoard.some((c) => c.isActive)).toBe(false);
  });
});

describe("activeStackCards (trail panel beside the card)", () => {
  beforeEach(() => setActivePinia(createPinia()));

  const titles = (store) => store.activeStackCards.map((c) => c.title);

  it("is empty with no contexts", () => {
    expect(useSessionRunStore().activeStackCards).toEqual([]);
  });

  // The panel only exists while a card is up, so "contexts exist but none is
  // active" must be empty — this is what separates it from contextBoard.
  it("is empty whenever nothing is active", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.deactivate();
    expect(store.activeStackCards).toEqual([]);

    store.switchContext(store.contextList[0].id);
    store.parkActiveContext({ reason: "blocked" });
    expect(store.activeStackCards).toEqual([]);

    store.switchContext(store.contextList[0].id);
    store.resolveFocus({ result: "done" }); // root complete steps off
    expect(store.activeStackCards).toEqual([]);
  });

  it("projects a depth-1 stack as one current card", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship the runner" });
    expect(store.activeStackCards).toHaveLength(1);
    expect(store.activeStackCards[0]).toMatchObject({
      title: "Ship the runner",
      result: null,
      depthIndex: 0,
      isActive: true,
    });
  });

  it("runs root → current, with exactly one current card at the end", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.drillIntoFocus({ title: "A.1" });
    store.drillIntoFocus({ title: "A.1.1" });
    const cards = store.activeStackCards;
    // Pins the direction the shingle depends on: index 0 draws at the TOP.
    expect(titles(store)).toEqual(["A", "A.1", "A.1.1"]);
    expect(cards.map((c) => c.depthIndex)).toEqual([0, 1, 2]);
    expect(cards.filter((c) => c.isActive)).toHaveLength(1);
    expect(cards[cards.length - 1].isActive).toBe(true);
  });

  // resolveFocus does not roll up the takeaway — only root completion
  // records a result on the frame itself.
  it("does not roll up results from sub-focuses", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.drillIntoFocus({ title: "A.1" });
    store.resolveFocus({ result: "  learned it  " });
    expect(store.activeStackCards).toHaveLength(1);
    expect(store.activeStackCards[0]).toMatchObject({
      title: "A",
      result: null,
      isActive: true,
    });
  });

  it("abandonFocus pops without writing a result up", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.drillIntoFocus({ title: "A.1" });
    store.abandonFocus();
    expect(store.activeStackCards).toHaveLength(1);
    expect(store.activeStackCards[0].result).toBe(null);
  });

  it("follows switchContext", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const aId = store.activeContextId;
    store.newContext({ title: "B" });
    store.drillIntoFocus({ title: "B.1" });
    store.drillIntoFocus({ title: "B.1.1" });
    const bId = store.activeContextId;

    store.switchContext(aId);
    expect(titles(store)).toEqual(["A"]);
    store.switchContext(bId);
    expect(titles(store)).toEqual(["B", "B.1", "B.1.1"]);
  });

  // The assertion that earns the shared toCards extraction: if either
  // projection is ever re-inlined, the board and the panel can drift apart.
  it("matches the active context's board column exactly", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const boardCards = () => store.contextBoard.find((c) => c.isActive).cards;
    expect(store.activeStackCards).toEqual(boardCards());

    store.drillIntoFocus({ title: "A.1" });
    store.drillIntoFocus({ title: "A.1.1" });
    store.resolveFocus({ result: "folded up" });
    expect(store.activeStackCards).toEqual(boardCards());
  });

  it("shows a resolved context read-only when it is re-opened", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const aId = store.activeContextId;
    store.resolveFocus({ result: "done" });
    store.switchContext(aId); // re-open the finished problem
    expect(store.activeStackCards).toHaveLength(1);
    expect(store.activeStackCards[0]).toMatchObject({ result: "done", isActive: true });
    expect(store.currentResolved).toBe(true);
  });
});
describe("sessionRunStore handoff fields", () => {
  beforeEach(() => setActivePinia(createPinia()));
  it("newContext keeps notes, origin and handoffId", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "T", notes: "n", origin: { tool: "thinkpad", ref: "thread:1" }, handoffId: "ho:1" });
    expect(store.activeContext).toMatchObject({
      notes: "n",
      origin: { tool: "thinkpad", ref: "thread:1" },
      handoffId: "ho:1",
      spentSeconds: 0,
    });
  });
  it("addSpentSeconds accumulates and ignores junk or unknown ids", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "T" });
    const id = store.activeContextId;
    store.addSpentSeconds({ id, seconds: 30 });
    store.addSpentSeconds({ id, seconds: 45 });
    store.addSpentSeconds({ id, seconds: 0 });
    store.addSpentSeconds({ id, seconds: NaN });
    store.addSpentSeconds({ id: 999, seconds: 10 });
    expect(store.activeContext.spentSeconds).toBe(75);
  });
});

describe("sessionRunStore awaiting a handoff", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("setAwaitingHandoff records and clears the id on the named context", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    const id = store.activeContextId;
    store.setAwaitingHandoff({ id, handoffId: "ho:1" });
    expect(store.activeContext.awaitingHandoffId).toBe("ho:1");
    store.setAwaitingHandoff({ id, handoffId: null });
    expect(store.activeContext.awaitingHandoffId).toBe(null);
  });

  it("ignores unknown contexts and non-string ids", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "A" });
    store.setAwaitingHandoff({ id: 999, handoffId: "ho:1" });
    store.setAwaitingHandoff({ id: store.activeContextId, handoffId: 5 });
    expect(store.activeContext.awaitingHandoffId).toBe(null);
  });
});

describe("sessionRunStore plans (queued steps)", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function started(steps = ["A", "B", "C"]) {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    store.planSteps({ steps });
    return store;
  }

  it("planSteps keeps the whole plan on the frame and starts step 1", () => {
    const store = started();
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "A"]);
    expect(store.activeStack[0]).toMatchObject({ steps: [{ prompt: "A" }, { prompt: "B" }, { prompt: "C" }], stepIndex: 0 });
    expect(store.activeFrame.fromStep).toBe(0);
    expect(store.activePlan).toMatchObject({ index: 0, running: true, done: [false, false, false] });
  });

  it("completing a step advances to the next one until the plan is done", () => {
    const store = started();
    store.resolveFocus();
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it", "B"]);
    store.resolveFocus();
    expect(store.activeFrame.title).toBe("C");
    store.resolveFocus();
    // Plan finished: the parent is active again, holding the plan with every step done.
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it"]);
    expect(store.activeFrame).toMatchObject({ stepIndex: 3 });
    expect(store.activePlan).toMatchObject({ index: 3, running: false, allDone: true });
  });

  it("backing out of a step keeps the plan, and startStep resumes any step", () => {
    const store = started();
    store.abandonFocus();
    expect(store.activeStack.map((f) => f.title)).toEqual(["Ship it"]);
    expect(store.activeFrame.steps.map((s) => s.prompt)).toEqual(["A", "B", "C"]);
    store.startStep({ index: 2 });
    expect(store.activeFrame).toMatchObject({ title: "C", fromStep: 2 });
    expect(store.activeStack[0].stepIndex).toBe(2);
  });

  it("a one-off sub-focus under a plan does not advance it", () => {
    const store = started();
    store.abandonFocus();
    store.drillIntoFocus({ title: "side quest" });
    store.resolveFocus();
    expect(store.activeFrame.title).toBe("Ship it");
    expect(store.activeFrame.stepIndex).toBe(0);
  });

  it("decomposing inside a step does not advance the parent plan until the step itself completes", () => {
    const store = started();
    store.drillIntoFocus({ title: "detail" });
    store.resolveFocus();
    expect(store.activeFrame.title).toBe("A");
    store.resolveFocus();
    expect(store.activeFrame.title).toBe("B");
  });

  it("ignores empty plans, bad indexes, and frames without a plan", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "X" });
    store.planSteps({ steps: ["  ", ""] });
    store.startStep({ index: 0 });
    expect(store.activeStack).toHaveLength(1);
    expect(store.activeFrame.steps).toBeUndefined();
    store.planSteps({ steps: ["only"] });
    store.abandonFocus();
    store.startStep({ index: 5 });
    store.startStep({ index: -1 });
    expect(store.activeStack).toHaveLength(1);
  });
});

describe("sessionRunStore: ending what was started", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("discardPlan drops the plan and the step you were on, back to the focus that held it", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    store.planSteps({ steps: ["A", "B"] });
    expect(store.activePlan).toBeTruthy();
    expect(store.depth).toBe(2);
    store.discardPlan();
    expect(store.activePlan).toBe(null);
    expect(store.depth).toBe(1);
    expect(store.currentFocus).toBe("Ship it");
    store.discardPlan(); // nothing to drop
    expect(store.depth).toBe(1);
  });

  it("stopping again without a reason keeps the reason already given", () => {
    const store = useSessionRunStore();
    store.newContext({ title: "Ship it" });
    const id = store.activeContextId;
    store.parkActiveContext({ reason: "waiting on review" });
    store.switchContext(id);
    store.parkActiveContext();
    expect(store.contexts.find((c) => c.id === id).waitingOn).toBe("waiting on review");
    store.switchContext(id);
    store.parkActiveContext({ reason: "blocked on API" });
    expect(store.contexts.find((c) => c.id === id).waitingOn).toBe("blocked on API");
  });
});
