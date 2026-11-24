import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const db = vi.hoisted(() => ({ records: [] }));
vi.mock("../persistence/workflowsDb.js", () => ({
  // A copy, as a real read would be: the store must not share the fake's array.
  getAllWorkflows: vi.fn(async () => db.records.map((r) => ({ ...r }))),
  upsertWorkflow: vi.fn(async () => {}),
  deleteWorkflow: vi.fn(async () => {}),
}));

import { useWorkflowStore } from "./workflowStore.js";
import { DEFAULT_WORKFLOWS } from "../model/defaultWorkflows.js";

function stubLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe("workflowStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    stubLocalStorage();
    db.records = [];
  });

  it("seeds the starter library once into an empty library", async () => {
    const s = useWorkflowStore();
    await s.load();
    expect(s.workflows).toHaveLength(DEFAULT_WORKFLOWS.length);
    expect(s.library[0].name).toBe(DEFAULT_WORKFLOWS[0].name);

    // The user later deletes them all; the next load (same storage) must not re-seed.
    db.records = [];
    setActivePinia(createPinia());
    const again = useWorkflowStore();
    await again.load();
    expect(again.workflows).toHaveLength(0);
  });

  it("creates, edits, counts uses, and removes", async () => {
    db.records = [{ id: "wf:old", name: "Kept", steps: ["a"] }];
    const s = useWorkflowStore();
    await s.load();
    expect(s.workflows.map((w) => w.name)).toEqual(["Kept"]);

    const wf = s.create({ name: "Debug", steps: ["Reproduce", { title: "Pick", decision: { options: ["A"] } }] });
    expect(s.byId(wf.id).steps).toHaveLength(2);
    s.update(wf.id, { name: "Debug a UI bug", steps: ["Only one"] });
    expect(s.byId(wf.id)).toMatchObject({ name: "Debug a UI bug", steps: [{ title: "Only one" }] });
    s.markUsed(wf.id);
    s.markUsed(wf.id);
    expect(s.byId(wf.id).uses).toBe(2);
    s.remove(wf.id);
    expect(s.byId(wf.id)).toBe(null);
  });
});
