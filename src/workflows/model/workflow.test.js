import { describe, expect, it } from "vitest";
import { applyWorkflowEdit, createWorkflow, normalizeWorkflowRecord, workflowLabel, workflowTag } from "./workflow.js";
import { DEFAULT_WORKFLOWS } from "./defaultWorkflows.js";

describe("createWorkflow", () => {
  it("cleans label, gap and steps, keeping calls", () => {
    const wf = createWorkflow({
      id: "wf:1",
      label: "  Debug a UI bug ",
      gap: " A bug I can't approach yet ",
      steps: ["Reproduce it", "", { prompt: "Pick a fix", expects: "call", options: ["A", "B"] }],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(wf).toEqual({
      id: "wf:1",
      label: "Debug a UI bug",
      version: 1,
      gap: "A bug I can't approach yet",
      steps: [
        { prompt: "Reproduce it", produces: "text" },
        { prompt: "Pick a fix", produces: "text", expects: "call", options: ["A", "B"] },
      ],
      uses: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads records saved with the earlier name / title / decision fields", () => {
    const wf = normalizeWorkflowRecord({ id: "wf:2", name: "Old", steps: [{ title: "Pick", decision: { options: ["x"] } }] });
    expect(wf).toMatchObject({ label: "Old", version: 1, steps: [{ prompt: "Pick", expects: "call", options: ["x"] }] });
  });

  it("is null without an id, and defaults junk", () => {
    expect(createWorkflow({ label: "x" })).toBe(null);
    expect(normalizeWorkflowRecord(null)).toBe(null);
    expect(normalizeWorkflowRecord({ id: "wf:2", label: "N", steps: "junk", uses: -1, version: 0 })).toMatchObject({
      steps: [],
      uses: 0,
      version: 1,
    });
  });

  it("labels untitled workflows and tags runs by id and version", () => {
    expect(workflowLabel({ label: "" })).toBe("Untitled workflow");
    expect(workflowLabel({ label: "Weekly review" })).toBe("Weekly review");
    expect(workflowTag({ id: "wf:1", version: 3 })).toBe("wf:1@v3");
    expect(workflowTag(null)).toBe(null);
  });
});

describe("applyWorkflowEdit", () => {
  it("changes only editable fields, stamps the time, and bumps the version when steps change", () => {
    const wf = createWorkflow({ id: "wf:1", label: "A", steps: ["x"], uses: 3, createdAt: "t0" });
    const next = applyWorkflowEdit(wf, { label: "B", steps: ["y", "z"], id: "hijack", uses: 99 }, { now: "t1" });
    expect(next).toMatchObject({ id: "wf:1", label: "B", uses: 3, createdAt: "t0", updatedAt: "t1", version: 2 });
    expect(next.steps.map((s) => s.prompt)).toEqual(["y", "z"]);
  });

  it("keeps the version when only the label or gap changes", () => {
    const wf = createWorkflow({ id: "wf:1", label: "A", steps: ["x"], version: 4 });
    expect(applyWorkflowEdit(wf, { label: "B", gap: "g" }).version).toBe(4);
    expect(applyWorkflowEdit(wf, { steps: ["x"] }).version).toBe(4);
  });
});

describe("starter library", () => {
  it("is valid and marks some steps as calls", () => {
    expect(DEFAULT_WORKFLOWS.length).toBeGreaterThan(0);
    for (const w of DEFAULT_WORKFLOWS) {
      const wf = createWorkflow({ ...w, id: "wf:x" });
      expect(wf.label).toBeTruthy();
      expect(wf.steps.length).toBe(w.steps.length);
    }
    const calls = DEFAULT_WORKFLOWS.flatMap((w) => createWorkflow({ ...w, id: "x" }).steps).filter((s) => s.expects === "call");
    expect(calls.length).toBeGreaterThan(0);
  });
});
