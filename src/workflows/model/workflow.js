// ---------------------------------------------------------------------------
// Workflow — a saved template of steps. It supplies steps to whatever asks for
// them (decompose a focus, start a routine). Using one COPIES its steps, so
// editing or deleting the template never changes work already started.
//
//   { id, name, gap, steps:[{title, decision?}], uses, createdAt, updatedAt }
//   gap:  the situation it closes ("Closes the gap when…"), optional.
//   uses: how many times its steps were taken. A count only, no run notes:
//         notes belong to the run, in the context where it happened.
//
// Pure data: no Vue, no store, no persistence.
// ---------------------------------------------------------------------------
import { cleanSteps } from "../../handoff/steps.js";

const MAX_NAME = 120;
const MAX_GAP = 280;

function oneLine(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A canonical workflow, or null without a usable id. Effects are passed in. */
export function createWorkflow({ id, name, gap, steps, uses, createdAt, updatedAt } = {}) {
  if (typeof id !== "string" || !id) return null;
  return {
    id,
    name: oneLine(name, MAX_NAME),
    gap: oneLine(gap, MAX_GAP),
    steps: cleanSteps(steps),
    uses: Number.isInteger(uses) && uses > 0 ? uses : 0,
    createdAt: typeof createdAt === "string" ? createdAt : null,
    updatedAt: typeof updatedAt === "string" ? updatedAt : typeof createdAt === "string" ? createdAt : null,
  };
}

/** Revive a stored record, or null when unusable. */
export function normalizeWorkflowRecord(record) {
  if (!record || typeof record !== "object") return null;
  return createWorkflow(record);
}

/** What to call a workflow on screen. */
export function workflowLabel(workflow) {
  return workflow?.name || "Untitled workflow";
}

/** A workflow with only the fields an editor may change applied. */
export function applyWorkflowEdit(workflow, patch = {}, { now } = {}) {
  if (!workflow) return null;
  return createWorkflow({
    ...workflow,
    name: "name" in patch ? patch.name : workflow.name,
    gap: "gap" in patch ? patch.gap : workflow.gap,
    steps: "steps" in patch ? patch.steps : workflow.steps,
    updatedAt: now ?? workflow.updatedAt,
  });
}
