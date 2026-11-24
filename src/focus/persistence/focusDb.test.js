import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexedDB as fakeIndexedDB } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";

const DB_NAME = "mindstream_focus";

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

// The store wires a module-scoped write-through subscription, so both modules
// are re-imported fresh per test (same pattern as padsDb.test.js).
async function loadModules() {
  const db = await import("./focusDb.js");
  const store = await import("../store/sessionRunStore.js");
  return { ...db, ...store };
}

const flushWrites = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("focusDb", () => {
  beforeEach(async () => {
    globalThis.indexedDB = fakeIndexedDB;
    vi.resetModules();
    setActivePinia(createPinia());
    await deleteDb(DB_NAME);
  });

  it("round-trips contexts and normalizes on read", async () => {
    const { upsertContext, getAllContexts } = await loadModules();
    await upsertContext({
      id: 1,
      stack: [{ id: 2, title: "Ship it", result: null, createdAt: null }],
      parked: false,
      waitingOn: "",
      resolved: false,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    await upsertContext({ id: 99, stack: [] }); // headless — dropped on read

    const rows = await getAllContexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, parked: false, resolved: false });
    expect(rows[0].stack[0].title).toBe("Ship it");
  });

  it("deleteContext removes a single record", async () => {
    const { upsertContext, deleteContext, getAllContexts } = await loadModules();
    await upsertContext({ id: 1, stack: [{ id: 2, title: "A" }] });
    await upsertContext({ id: 3, stack: [{ id: 4, title: "B" }] });
    await deleteContext(1);
    const rows = await getAllContexts();
    expect(rows.map((r) => r.id)).toEqual([3]);
  });

  it("store hydration restores contexts and derives nextId past every seen id", async () => {
    const { upsertContext, useSessionRunStore } = await loadModules();
    await upsertContext({
      id: 5,
      stack: [
        { id: 6, title: "Root", result: null, createdAt: null },
        { id: 9, title: "Child", result: null, createdAt: null },
      ],
      parked: true,
      waitingOn: "review",
      resolved: false,
      createdAt: null,
    });

    const store = useSessionRunStore();
    await store.loadContexts();

    expect(store.isLoaded).toBe(true);
    expect(store.contexts).toHaveLength(1);
    expect(store.contexts[0]).toMatchObject({ id: 5, parked: true, waitingOn: "review" });
    // No context auto-activates: reload is a deliberate re-entry via the rail.
    expect(store.activeContextId).toBe(null);
    expect(store.nextId).toBe(10);
  });

  it("write-through persists new contexts and deletes ended ones", async () => {
    const { useSessionRunStore, getAllContexts } = await loadModules();
    const store = useSessionRunStore();
    await store.loadContexts();

    store.newContext({ title: "Persist me" });
    await flushWrites();
    let rows = await getAllContexts();
    expect(rows).toHaveLength(1);
    expect(rows[0].stack[0].title).toBe("Persist me");

    store.endActiveContext();
    await flushWrites();
    rows = await getAllContexts();
    expect(rows).toHaveLength(0);
  });

  it("hydration is idempotent across repeated loadContexts calls", async () => {
    const { useSessionRunStore } = await loadModules();
    const store = useSessionRunStore();
    await store.loadContexts();
    store.newContext({ title: "Only once" });
    await store.loadContexts();
    expect(store.contexts).toHaveLength(1);
  });
});
