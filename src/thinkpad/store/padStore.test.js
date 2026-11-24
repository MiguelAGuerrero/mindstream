import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("../persistence/padsDb", () => ({
  upsertPad: vi.fn(() => Promise.resolve()),
  deletePad: vi.fn(() => Promise.resolve()),
  clearPads: vi.fn(() => Promise.resolve()),
  getAllPads: vi.fn(() => Promise.resolve([])),
}));

import { usePadStore } from "./padStore";

describe("padStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts empty", () => {
    const store = usePadStore();
    expect(store.pads).toEqual([]);
    expect(store.currentPadId).toBeNull();
    expect(store.currentPad).toBeNull();
    expect(store.surfaceHead).toBeNull();
  });

  it("loadPads preserves in-memory pad over stale empty-thread DB row", async () => {
    const { getAllPads } = await import("../persistence/padsDb");
    let resolveLoad;
    getAllPads.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const store = usePadStore();
    const loading = store.loadPads();
    store.newPad({ outcome: "In progress" });
    expect(store.currentPad?.title).toBe("In progress");

    resolveLoad([
      {
        id: store.currentPadId,
        title: "In progress",
        threads: [],
        config: { timing: { enabled: true, timeboxMinutes: 10 } },
        state: "new",
        createdAt: store.currentPad.createdAt,
        updatedAt: store.currentPad.updatedAt,
        doc: { text: "", annotations: [] },
      },
    ]);
    await loading;

    expect(store.currentPad?.title).toBe("In progress");
  });

  it("Write more opens under a frozen draft and adds text as a new version", () => {
    const store = usePadStore();
    store.createNewPad({ title: "Plan" });
    store.setPadText({ text: "The plan is a mess." });
    store.stampDraft();
    expect(store.writeMoreText).toBeNull();
    store.beginWriteMore();
    expect(store.writeMoreText).toBe("");
    store.setWriteMoreText({ text: "Dates slip." });
    expect(store.writeMoreText).toBe("Dates slip.");
    store.addWriteMore();
    expect(store.writeMoreText).toBeNull();
    expect(store.viewPad.frozenText).toBe("The plan is a mess.\n\nDates slip.");
    expect(store.draftHistory).toHaveLength(2);
    expect(store.isDraftFrozen).toBe(true);
  });

  it("overlapping staged results block Next Draft until one is kept", () => {
    const store = usePadStore();
    store.createNewPad({ title: "Plan" });
    store.setPadText({ text: "The plan is a mess of loose ends." });
    store.stampDraft();
    for (const [start, end, result] of [[14, 18, "tangle"], [12, 32, "pile of open questions"]]) {
      store.drillIntoSpan({ parentThreadId: null, title: "t", selectionStart: start, selectionEnd: end, selectedText: "The plan is a mess of loose ends.".slice(start, end) });
      const thread = store.currentPad.threads[store.currentPad.threads.length - 1];
      store.navigateToThread(thread.id);
      store.setPadText({ padLocator: thread.id, text: result });
      store.resolveThreadIntoParent({ threadId: thread.id });
    }
    expect(store.stagedConflictsOnSurface).toHaveLength(1);
    store.advanceToNextDraft();
    expect(store.viewPad.text).toBe("The plan is a mess of loose ends."); // refused
    const group = store.stagedConflictsOnSurface[0];
    const keep = group.find((c) => c.text === "pile of open questions");
    store.keepStagedOutput({ keepId: keep.stagedId, groupIds: group.map((c) => c.stagedId) });
    expect(store.stagedConflictsOnSurface).toEqual([]);
    store.advanceToNextDraft();
    expect(store.viewPad.text).toBe("The plan is pile of open questions.");
  });

  it("createNewPad adds a pad to the pool and sets it active", () => {
    const store = usePadStore();
    store.createNewPad({ title: "Fix auth bug" });
    expect(store.pads).toHaveLength(1);
    expect(store.currentPad.title).toBe("Fix auth bug");
  });

  it("setActivePad switches between pads in the pool", () => {
    const store = usePadStore();
    const a = store.createNewPad({ title: "A" });
    const b = store.createNewPad({ title: "B" });
    expect(store.currentPadId).toBe(b.id);
    store.setActivePad(a.id);
    expect(store.currentPad.title).toBe("A");
  });

  it("deletePad removes from pool and updates active selection", () => {
    const store = usePadStore();
    const a = store.createNewPad({ title: "A" });
    const b = store.createNewPad({ title: "B" });
    store.deletePad(b.id);
    expect(store.pads).toHaveLength(1);
    expect(store.currentPadId).toBe(a.id);
  });

  it("setPadText updates the root document text", () => {
    const store = usePadStore();
    store.createNewPad({ title: "x" });
    store.setPadText({ padLocator: null, text: "my free thoughts" });
    expect(store.currentThinkPad.text).toBe("my free thoughts");
  });

  describe("recursive resolve (drill-down)", () => {
    function withDoc(store, text) {
      store.createNewPad({ title: "doc" });
      store.setPadText({ padLocator: null, text });
    }

    it("drillIntoSpan descends onto an empty sub-pad; resolveThreadIntoParent stages and ascends; Next Draft applies", () => {
      const store = usePadStore();
      withDoc(store, "the mess here");
      const frame = store.drillIntoSpan({ parentThreadId: null, title: "work it", selectionStart: 4, selectionEnd: 8, selectedText: "mess" });
      expect(frame).not.toBeNull();
      expect(store.viewThreadId).toBe(frame.id);
      expect(store.viewPad.text).toBe("");

      store.setPadText({ padLocator: frame.id, text: "a clean result" });
      const res = store.resolveThreadIntoParent({ threadId: frame.id });
      expect(res.resolved).toBe(true);
      expect(store.viewThreadId).toBeNull();
      expect(store.currentThinkPad.text).toBe("the mess here");
      expect(store.isDraftFrozen).toBe(true);
      expect(store.stagedOutputs).toHaveLength(1);
      store.advanceToNextDraft({ padLocator: null });
      expect(store.currentThinkPad.text).toBe("the a clean result here");
    });

    it("drill within a sub-pad nests on subThreads; resolve stages into parent pad; Next Draft applies", () => {
      const store = usePadStore();
      withDoc(store, "outer span text");
      const parent = store.drillIntoSpan({ parentThreadId: null, title: "p", selectionStart: 0, selectionEnd: 5, selectedText: "outer" });
      const child = store.drillIntoSpan({ parentThreadId: parent.id, title: "c", selectionStart: 0, selectionEnd: 5, selectedText: "outer" });
      expect(store.viewThreadId).toBe(child.id);
      store.setPadText({ padLocator: child.id, text: "inner done" });
      store.resolveThreadIntoParent({ threadId: child.id });
      expect(store.viewThreadId).toBe(parent.id);
      expect(store.viewPad.text).toBe("");
      expect(store.stagedOutputs).toHaveLength(1);
      store.advanceToNextDraft({ padLocator: parent.id });
      expect(store.viewPad.text).toBe("inner done");
    });

    it("open thread requires an explicit synthesized result; then resolves up", () => {
      const store = usePadStore();
      withDoc(store, "the mess here");
      const frame = store.drillIntoSpan({ parentThreadId: null, title: "work it", selectionStart: 4, selectionEnd: 8, selectedText: "mess" });
      store.setPadText({ padLocator: frame.id, text: "idea one\n\nidea two" });
      expect(store.resolveThreadIntoParent({ threadId: frame.id })).toBeNull();
      const res = store.resolveThreadIntoParent({ threadId: frame.id, result: "synthesized call" });
      expect(res.resolved).toBe(true);
      expect(store.viewThreadId).toBeNull();
      expect(store.stagedOutputs).toHaveLength(1);
      expect(store.stagedOutputs[0].text).toBe("synthesized call");
    });

    it("ascendThread discards an untouched drill (and its anchor) but keeps a worked one", () => {
      const store = usePadStore();
      withDoc(store, "alpha beta gamma");
      const drill = store.drillIntoSpan({ parentThreadId: null, title: "g", selectionStart: 6, selectionEnd: 10, selectedText: "beta" });
      expect(store.currentThinkPad.annotations).toHaveLength(1);
      store.ascendThread();
      expect(store.viewThreadId).toBeNull();
      expect(store.currentPad.threads.find((f) => f.id === drill.id)).toBeUndefined();
      expect(store.currentThinkPad.annotations).toHaveLength(0);

      const drill2 = store.drillIntoSpan({ parentThreadId: null, title: "g2", selectionStart: 6, selectionEnd: 10, selectedText: "beta" });
      store.setPadText({ padLocator: drill2.id, text: "beta — with real work" });
      store.ascendThread();
      expect(store.viewThreadId).toBeNull();
      expect(store.currentPad.threads.find((f) => f.id === drill2.id)).toBeTruthy();
    });

    it("surfaceHead / viewPad reflect the active thread surface and persist", async () => {
      const { upsertPad } = await import("../persistence/padsDb");
      const store = usePadStore();
      withDoc(store, "hello world");
      expect(store.viewThreadId).toBeNull();
      expect(store.viewPad.text).toBe("hello world");
      const f = store.drillIntoSpan({ parentThreadId: null, title: "g", selectionStart: 0, selectionEnd: 5, selectedText: "hello" });
      expect(store.viewThreadId).toBe(f.id);
      expect(store.viewPad.text).toBe("");
      expect(upsertPad).toHaveBeenCalled();
    });

    it("jumpToSurfaceIndex(0) returns to the root document surface", () => {
      const store = usePadStore();
      withDoc(store, "outer span text");
      const parent = store.drillIntoSpan({ parentThreadId: null, title: "p", selectionStart: 0, selectionEnd: 5, selectedText: "outer" });
      const child = store.drillIntoSpan({ parentThreadId: parent.id, title: "c", selectionStart: 0, selectionEnd: 5, selectedText: "outer" });
      expect(store.surfaceHead).toBe(child.id);
      expect(store.threadPath.map((f) => f.id)).toEqual([parent.id, child.id]);
      store.jumpToSurfaceIndex(0);
      expect(store.surfaceHead).toBeNull();
      expect(store.viewThreadId).toBeNull();
    });
  });

  describe("draft history navigation", () => {
    it("viewingDraftN starts as null", () => {
      const store = usePadStore();
      store.createNewPad({ title: "t" });
      expect(store.viewingDraftN).toBeNull();
    });

    it("isDraftHistoryView is false when viewingDraftN is null", () => {
      const store = usePadStore();
      store.createNewPad({ title: "t" });
      expect(store.isDraftHistoryView).toBe(false);
    });

    it("isDraftHistoryView is true when viewingDraftN is set", () => {
      const store = usePadStore();
      store.createNewPad({ title: "t" });
      store.viewingDraftN = 0;
      expect(store.isDraftHistoryView).toBe(true);
    });

    it("exitDraftHistory clears viewingDraftN to null", () => {
      const store = usePadStore();
      store.createNewPad({ title: "t" });
      store.viewingDraftN = 2;
      store.exitDraftHistory();
      expect(store.viewingDraftN).toBeNull();
    });

    it("navigateToDraft is a no-op for an out-of-bounds index", () => {
      const store = usePadStore();
      store.createNewPad({ title: "t" });
      store.navigateToDraft(99);
      expect(store.viewingDraftN).toBeNull();
    });

    it("viewingDraftEntry returns the correct draftHistory entry", () => {
      const store = usePadStore();
      store.createNewPad({ title: "entry" });
      const fakeHistory = [
        { n: 0, text: "first text", at: "2026-01-01T00:00:00.000Z", contributions: [] },
        { n: 1, text: "second text", at: "2026-01-01T00:00:01.000Z", contributions: [] },
      ];
      store.currentPad.doc.draftHistory = fakeHistory;
      store.navigateToDraft(0);
      expect(store.viewingDraftEntry).toMatchObject({ n: 0, text: "first text" });
      store.navigateToDraft(1);
      expect(store.viewingDraftEntry).toMatchObject({ n: 1, text: "second text" });
    });
  });
  describe("open-item gate", () => {
    function withDoc(store, text) {
      store.createNewPad({ title: "doc" });
      store.setPadText({ padLocator: null, text });
    }

    /** root "outer span text" → drill "outer" (parent) → drill inside it (child). Leaves the surface on the parent. */
    function parentWithOpenChild(store) {
      withDoc(store, "outer span text");
      const parent = store.drillIntoSpan({ parentThreadId: null, title: "parent goal", selectionStart: 0, selectionEnd: 5, selectedText: "outer" });
      store.setPadText({ padLocator: parent.id, text: "one clear call" });
      const child = store.drillIntoSpan({ parentThreadId: parent.id, title: "Why might this be wrong?", selectionStart: 4, selectionEnd: 9, selectedText: "clear" });
      store.navigateToThread(parent.id);
      const childAnn = store.currentPad.threads[0].doc.annotations.find((a) => a.stepId === child.steps[0].id);
      return { parent, child, childAnnotationId: childAnn.id };
    }

    it("openItemsAt lists the undecided open items of a level", () => {
      const store = usePadStore();
      const { parent, childAnnotationId } = parentWithOpenChild(store);
      expect(store.openItemsAt(parent.id).map((i) => i.id)).toEqual([childAnnotationId]);
      expect(store.openItemsAt(null)).toHaveLength(1); // the parent drill itself, open at the root
    });

    it("canResolveSurface is false while the surface has an undecided open item", () => {
      const store = usePadStore();
      const { childAnnotationId, parent } = parentWithOpenChild(store);
      expect(store.viewThreadId).toBe(parent.id);
      expect(store.canResolveSurface).toBe(false);
      store.disposeOpenItem({ padLocator: parent.id, id: childAnnotationId, kind: "accepted", note: "fine for now" });
      expect(store.canResolveSurface).toBe(true);
    });

    it("canResolveSurface is false on the root document and on an empty sub-pad", () => {
      const store = usePadStore();
      withDoc(store, "alpha beta");
      expect(store.canResolveSurface).toBe(false);
      store.drillIntoSpan({ parentThreadId: null, title: "g", selectionStart: 0, selectionEnd: 5, selectedText: "alpha" });
      expect(store.canResolveSurface).toBe(false);
    });

    it("resolveThreadIntoParent refuses while an open item is undecided, then resolves once decided", () => {
      const store = usePadStore();
      const { parent, childAnnotationId } = parentWithOpenChild(store);
      expect(store.resolveThreadIntoParent({ threadId: parent.id })).toBeNull();
      expect(store.viewThreadId).toBe(parent.id);
      store.disposeOpenItem({ padLocator: parent.id, id: childAnnotationId, kind: "parked" });
      expect(store.resolveThreadIntoParent({ threadId: parent.id })).toMatchObject({ resolved: true });
      expect(store.viewThreadId).toBeNull();
    });

    it("disposeOpenItem with a lift opens the item at the target level and persists", async () => {
      const { upsertPad } = await import("../persistence/padsDb");
      const store = usePadStore();
      const { parent, childAnnotationId } = parentWithOpenChild(store);
      upsertPad.mockClear();
      store.disposeOpenItem({ padLocator: parent.id, id: childAnnotationId, kind: "lifted", target: null, note: "bigger question" });
      expect(store.openItemsAt(parent.id)).toEqual([]);
      expect(store.openItemsAt(null).map((i) => i.text)).toContain("bigger question");
      expect(upsertPad).toHaveBeenCalled();
    });

    it("clearDisposition re-opens an item", () => {
      const store = usePadStore();
      const { parent, childAnnotationId } = parentWithOpenChild(store);
      store.disposeOpenItem({ padLocator: parent.id, id: childAnnotationId, kind: "accepted" });
      store.clearDisposition({ padLocator: parent.id, id: childAnnotationId });
      expect(store.openItemsAt(parent.id).map((i) => i.id)).toEqual([childAnnotationId]);
    });

    it("openCountAt counts a level's open items (0 for an unknown level)", () => {
      const store = usePadStore();
      const { parent } = parentWithOpenChild(store);
      expect(store.openCountAt(parent.id)).toBe(1);
      expect(store.openCountAt("thread:nope")).toBe(0);
    });
  });
});
