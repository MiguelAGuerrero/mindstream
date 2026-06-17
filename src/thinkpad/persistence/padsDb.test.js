import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexedDB as fakeIndexedDB } from "fake-indexeddb";

const DB_NAME = "mindstream_local";

function deleteDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function loadDbApi() {
  return import("./padsDb");
}

describe("padsDb", () => {
  beforeEach(async () => {
    globalThis.indexedDB = fakeIndexedDB;
    vi.resetModules();
    await deleteDb(DB_NAME);
  });

  it("stores multiple pads and returns latest first", async () => {
    const { getAllPads, savePad } = await loadDbApi();
    await savePad({
      id: "ctx:one",
      rootProblemId: 1,
      focusedProblemId: 1,
      focusStack: [{ problemId: 1 }],
      currentStepIndex: 0,
      timerValue: 0,
      rootTitle: "One",
      focusedTitle: "One",
      problemSnapshots: [{ id: 1, title: "One", steps: [] }],
      branchLinks: [],
      updatedAt: new Date("2026-03-26T10:00:00.000Z"),
    });

    await savePad({
      id: "ctx:two",
      rootProblemId: 2,
      focusedProblemId: 2,
      focusStack: [{ problemId: 2 }],
      currentStepIndex: 0,
      timerValue: 0,
      rootTitle: "Two",
      focusedTitle: "Two",
      problemSnapshots: [{ id: 2, title: "Two", steps: [] }],
      branchLinks: [],
      updatedAt: new Date("2026-03-26T11:00:00.000Z"),
    });

    const rows = await getAllPads();
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("ctx:two");
    expect(rows[1].id).toBe("ctx:one");
  });

  it("clears persisted pad", async () => {
    const { clearPads, getAllPads, savePad } = await loadDbApi();
    await savePad({
      rootProblemId: 1,
      focusedProblemId: 1,
      focusStack: [{ problemId: 1 }],
      currentStepIndex: 0,
      timerValue: 0,
      rootTitle: "One",
      focusedTitle: "One",
      problemSnapshots: [{ id: 1, title: "One", steps: [] }],
      branchLinks: [],
      updatedAt: new Date(),
    });
    await clearPads();
    const rows = await getAllPads();
    expect(rows).toHaveLength(0);
  });

  it("deletes only the targeted pad", async () => {
    const { deletePad, getAllPads, savePad } = await loadDbApi();
    await savePad({
      id: "ctx:a",
      rootProblemId: 1,
      problemSnapshots: [{ id: 1, title: "One", steps: [] }],
      branchLinks: [],
      updatedAt: new Date("2026-03-26T10:00:00.000Z"),
    });
    await savePad({
      id: "ctx:b",
      rootProblemId: 2,
      problemSnapshots: [{ id: 2, title: "Two", steps: [] }],
      branchLinks: [],
      updatedAt: new Date("2026-03-26T11:00:00.000Z"),
    });

    await deletePad("ctx:a");
    const rows = await getAllPads();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("ctx:b");
  });
});
