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
    expect(s.library[0].label).toBe(DEFAULT_WORKFLOWS[0].label);

    // The user later deletes them all; the next load (same storage) must not re-seed.
    db.records = [];
    setActivePinia(createPinia());
    const again = useWorkflowStore();
    await again.load();
    expect(again.workflows).toHaveLength(0);
  });

  it("creates, edits, counts uses, and removes", async () => {
    db.records = [{ id: "wf:old", label: "Kept", version: 1, gap: "", steps: [{ prompt: "a", produces: "text" }], uses: 0 }];
    const s = useWorkflowStore();
    await s.load();
    expect(s.workflows.map((w) => w.label)).toEqual(["Kept"]);

    const wf = s.create({ label: "Debug", steps: ["Reproduce", { prompt: "Pick", expects: "call", options: ["A"] }] });
    expect(s.byId(wf.id).steps).toHaveLength(2);
    s.update(wf.id, { label: "Debug a UI bug", steps: ["Only one"] });
    expect(s.byId(wf.id)).toMatchObject({ label: "Debug a UI bug", version: 2, steps: [{ prompt: "Only one" }] });
    s.markUsed(wf.id);
    s.markUsed(wf.id);
    expect(s.byId(wf.id).uses).toBe(2);
    s.remove(wf.id);
    expect(s.byId(wf.id)).toBe(null);
  });
});
