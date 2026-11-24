// ---------------------------------------------------------------------------
// Workflow — an ordered list of prompts, kept in the workspace library
// (roadmap §4.3; capture-templates-proposal §3.1, §9). It is tool-agnostic and
// travels as content: using one copies its steps into the request, so editing
// or deleting it never changes a run already started.
//
//   { id, label, version, gap, steps: [Step], uses, createdAt, updatedAt }
//   version: bumped whenever the steps change; with the id it forms the
//            opaque `tag` a run carries (roadmap §4.2), for comparing runs.
//   gap:     the situation it closes ("Closes the gap when…"), optional.
//   uses:    how many times its steps were taken. A count only: notes belong
//            to the run, in the context where it happened, never to the workflow.
//
// Pure data: no Vue, no store, no persistence.
// ---------------------------------------------------------------------------
import { cleanSteps } from "../../handoff/steps.js";

const MAX_LABEL = 120;
const MAX_GAP = 280;

function oneLine(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A canonical workflow, or null without a usable id. Effects are passed in. */
export function createWorkflow({ id, label, name, version, gap, steps, uses, createdAt, updatedAt } = {}) {
  if (typeof id !== "string" || !id) return null;
  return {
    id,
    // `name` was the field before the proposal's `label`; read either.
    label: oneLine(label ?? name, MAX_LABEL),
    version: Number.isInteger(version) && version > 0 ? version : 1,
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
  return workflow?.label || "Untitled workflow";
}

/** The opaque tag a run of this workflow carries: which workflow, which version. */
export function workflowTag(workflow) {
  return workflow?.id ? `${workflow.id}@v${workflow.version ?? 1}` : null;
}

/**
 * A workflow with only the fields an editor may change applied. Changing the
 * steps bumps the version, so runs of the old and new steps stay distinguishable.
 */
export function applyWorkflowEdit(workflow, patch = {}, { now } = {}) {
  if (!workflow) return null;
  const steps = "steps" in patch ? cleanSteps(patch.steps) : workflow.steps;
  const changed = JSON.stringify(steps) !== JSON.stringify(workflow.steps);
  return createWorkflow({
    ...workflow,
    label: "label" in patch ? patch.label : workflow.label,
    gap: "gap" in patch ? patch.gap : workflow.gap,
    steps,
    version: changed ? (workflow.version ?? 1) + 1 : workflow.version,
    updatedAt: now ?? workflow.updatedAt,
  });
}
