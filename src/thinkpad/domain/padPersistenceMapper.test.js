import { describe, expect, it } from "vitest";
import {
  normalizePad,
  normalizePadRecord,
  buildPadSnapshot,
} from "./padPersistenceMapper";
import { createPad, addRootThread } from "./padDomain";
import { makeTestEnv } from "./__testkit__";

// Fixed injected clock for raw-record normalizer calls. The mapper is pure: it
// never reads the wall clock, so missing timestamps default to this `now`.
const NOW = "2026-01-01T00:00:00.000Z";

describe("normalizePad", () => {
  it("returns null for invalid records", () => {
    expect(normalizePad(null)).toBeNull();
    expect(normalizePad({})).toBeNull();
    expect(normalizePad({ id: "" })).toBeNull();
  });

  it("normalizes a minimal valid record", () => {
    const result = normalizePad({ id: "ctx:1" }, { now: NOW });
    expect(result.id).toBe("ctx:1");
    expect(result.threads).toEqual([]);
    expect(result.state).toBe("new");
    expect(result).not.toHaveProperty("log");
  });

  it("preserves a fully-formed Pad round-trip", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "Fix the auth bug", now: env.now }, env);
    ({ pad } = addRootThread(pad, { title: "Reproduce" }, env));
    const snapshot = buildPadSnapshot(pad, { now: env.now });
    const restored = normalizePad(snapshot, { now: env.now });
    expect(restored.title).toBe("Fix the auth bug");
    expect(restored.threads).toHaveLength(1);
    expect(restored.threads[0].steps[0].title).toBe("Reproduce");
  });

  it("filters out invalid steps and frames", () => {
    const result = normalizePad({
      id: "ctx:1",
      threads: [
        { id: "f1", type: "adhoc", steps: [{ id: "s1", title: "ok" }] },
        { /* missing id */ type: "adhoc", steps: [] },
      ],
    }, { now: NOW });
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].steps[0].title).toBe("ok");
  });

  it("defaults doc to empty when field is absent", () => {
    const result = normalizePad({ id: "ctx:1" }, { now: NOW });
    expect(result.doc).toEqual({ text: "", annotations: [], phase: "stream", frozenText: null, staged: [], versions: [], draftHistory: [] });
  });

  it("normalizes doc text and filters invalid annotations", () => {
    const result = normalizePad({
      id: "ctx:1",
      doc: {
        text: "my thoughts",
        annotations: [
          { id: "ann:1", selectionStart: 0, selectionEnd: 5, stepId: "step:1", selectedText: "my th", stepTitle: "Step", createdAt: "2026-01-01T00:00:00.000Z" },
          { id: "ann:2", selectionStart: 5, selectionEnd: 5, stepId: "step:1" }, // invalid range
          { id: "", selectionStart: 0, selectionEnd: 3, stepId: "step:1" },      // missing id
        ],
      },
    }, { now: NOW });
    expect(result.doc.text).toBe("my thoughts");
    expect(result.doc.annotations).toHaveLength(1);
    expect(result.doc.annotations[0].id).toBe("ann:1");
  });

  it("survives a full round-trip with doc data", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "think test", now: env.now }, env);
    pad = { ...pad, doc: { text: "initial thought", annotations: [] } };
    const snapshot = buildPadSnapshot(pad, { now: env.now });
    const restored = normalizePad(snapshot, { now: env.now });
    expect(restored.doc.text).toBe("initial thought");
    expect(restored.doc.annotations).toEqual([]);
  });
});

describe("normalizePadRecord", () => {
  it("returns null for invalid input", () => {
    expect(normalizePadRecord(null)).toBeNull();
    expect(normalizePadRecord("string")).toBeNull();
    expect(normalizePadRecord({ id: "" })).toBeNull();
  });

  it("normalizes any record with a valid id (no versioning)", () => {
    const result = normalizePadRecord({ id: "ctx:1" }, { now: NOW });
    expect(result.id).toBe("ctx:1");
    expect(result.threads).toEqual([]);
  });
});

describe("buildPadSnapshot", () => {
  it("serializes an in-memory pad to a record", () => {
    const env = makeTestEnv();
    let pad = createPad({ title: "Build feature X", now: env.now }, env);
    ({ pad } = addRootThread(pad, { title: "Sketch" }, env));
    const snapshot = buildPadSnapshot(pad, { now: env.now });
    expect(snapshot.title).toBe("Build feature X");
    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0].steps).toHaveLength(1);
    expect(snapshot.threads[0].steps[0].title).toBe("Sketch");
    expect(snapshot.updatedAt).toEqual(expect.any(String));
    // A round-trip preserves the single-step thread.
    const restored = normalizePad(snapshot, { now: env.now });
    expect(restored.threads[0].steps[0].title).toBe("Sketch");
  });
});
