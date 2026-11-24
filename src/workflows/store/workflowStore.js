// ---------------------------------------------------------------------------
// Workflow library store. Holds workflows; never holds a run. Persists to
// its own IndexedDB with write-through on each change, and seeds the starter
// library once into an empty, never-seeded library.
// ---------------------------------------------------------------------------
import { acceptHMRUpdate, defineStore } from "pinia";
import { applyWorkflowEdit, createWorkflow } from "../model/workflow.js";
import { DEFAULT_WORKFLOWS } from "../model/defaultWorkflows.js";
import { deleteWorkflow, getAllWorkflows, upsertWorkflow } from "../persistence/workflowsDb.js";

const SEEDED_KEY = "mindstream.workflows.seeded";
let seq = 0;

function makeId() {
  return `wf:${Date.now().toString(36)}:${(seq++).toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readSeeded() {
  try {
    return globalThis.localStorage?.getItem(SEEDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSeeded() {
  try {
    globalThis.localStorage?.setItem(SEEDED_KEY, "1");
  } catch {
    // Without storage the library just re-seeds when empty; harmless.
  }
}

function persist(workflow) {
  upsertWorkflow(workflow).catch((error) => console.error("Failed to save workflow.", error));
}

export const useWorkflowStore = defineStore("workflows", {
  state: () => ({
    workflows: [],
    isLoaded: false,
  }),

  getters: {
    /** Most recently edited first. */
    library(s) {
      return [...s.workflows].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    },
    byId: (s) => (id) => s.workflows.find((w) => w.id === id) ?? null,
  },

  actions: {
    async load() {
      if (this.isLoaded) return;
      try {
        this.workflows = await getAllWorkflows();
      } catch (error) {
        console.error("Failed to load workflows.", error);
      }
      if (this.workflows.length === 0 && !readSeeded()) this._seed();
      this.isLoaded = true;
    },

    _seed() {
      const base = Date.now();
      // Staggered timestamps keep the starter order stable in the library.
      DEFAULT_WORKFLOWS.forEach((w, i) => {
        const at = new Date(base - i * 1000).toISOString();
        const wf = createWorkflow({ ...w, id: makeId(), createdAt: at, updatedAt: at });
        this.workflows.push(wf);
        persist(wf);
      });
      writeSeeded();
    },

    /** Create a workflow and return it. */
    create({ label = "", gap = "", steps = [] } = {}) {
      const now = nowIso();
      const wf = createWorkflow({ id: makeId(), label, gap, steps, createdAt: now, updatedAt: now });
      this.workflows.push(wf);
      persist(wf);
      return wf;
    },

    /** Apply editor changes (label, gap, steps). Changing the steps bumps the version. */
    update(id, patch = {}) {
      const i = this.workflows.findIndex((w) => w.id === id);
      if (i < 0) return null;
      const next = applyWorkflowEdit(this.workflows[i], patch, { now: nowIso() });
      this.workflows.splice(i, 1, next);
      persist(next);
      return next;
    },

    remove(id) {
      const before = this.workflows.length;
      this.workflows = this.workflows.filter((w) => w.id !== id);
      if (this.workflows.length !== before) {
        deleteWorkflow(id).catch((error) => console.error("Failed to delete workflow.", error));
      }
    },

    /** Count one use of a workflow's steps. Does not change its updatedAt. */
    markUsed(id) {
      const wf = this.workflows.find((w) => w.id === id);
      if (!wf) return;
      wf.uses = (wf.uses || 0) + 1;
      persist(wf);
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWorkflowStore, import.meta.hot));
}
