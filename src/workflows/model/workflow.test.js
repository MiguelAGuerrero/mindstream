import { describe, expect, it } from "vitest";
import { applyWorkflowEdit, createWorkflow, normalizeWorkflowRecord, workflowLabel } from "./workflow.js";
import { DEFAULT_WORKFLOWS } from "./defaultWorkflows.js";

describe("createWorkflow", () => {
  it("cleans name, gap and steps, keeping decisions", () => {
    const wf = createWorkflow({
      id: "wf:1",
      name: "  Debug a UI bug ",
      gap: " A bug I can't approach yet ",
      steps: ["Reproduce it", "", { title: "Pick a fix", decision: { options: ["A", "B"] } }],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(wf).toEqual({
      id: "wf:1",
      name: "Debug a UI bug",
      gap: "A bug I can't approach yet",
      steps: [{ title: "Reproduce it" }, { title: "Pick a fix", decision: { options: ["A", "B"] } }],
      uses: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("is null without an id, and revives stored records", () => {
    expect(createWorkflow({ name: "x" })).toBe(null);
    expect(normalizeWorkflowRecord(null)).toBe(null);
    expect(normalizeWorkflowRecord({ id: "wf:2", name: "N", steps: "junk", uses: -1 })).toMatchObject({
      steps: [],
      uses: 0,
    });
  });

  it("labels untitled workflows", () => {
    expect(workflowLabel({ name: "" })).toBe("Untitled workflow");
    expect(workflowLabel({ name: "Weekly review" })).toBe("Weekly review");
  });
});

describe("applyWorkflowEdit", () => {
  it("changes only editable fields and stamps the time", () => {
    const wf = createWorkflow({ id: "wf:1", name: "A", steps: ["x"], uses: 3, createdAt: "t0" });
    const next = applyWorkflowEdit(wf, { name: "B", steps: ["y", "z"], id: "hijack", uses: 99 }, { now: "t1" });
    expect(next).toMatchObject({ id: "wf:1", name: "B", uses: 3, createdAt: "t0", updatedAt: "t1" });
    expect(next.steps).toEqual([{ title: "y" }, { title: "z" }]);
  });
});

describe("starter library", () => {
  it("is valid and marks some decision steps", () => {
    expect(DEFAULT_WORKFLOWS.length).toBeGreaterThan(0);
    for (const w of DEFAULT_WORKFLOWS) {
      const wf = createWorkflow({ ...w, id: "wf:x" });
      expect(wf.name).toBeTruthy();
      expect(wf.steps.length).toBe(w.steps.length);
    }
    const decisions = DEFAULT_WORKFLOWS.flatMap((w) => createWorkflow({ ...w, id: "x" }).steps).filter((s) => s.decision);
    expect(decisions.length).toBeGreaterThan(0);
  });
});
