import { afterEach, describe, expect, it } from "vitest";
import { createFocusUi } from "./useFocusUi.js";
import { DEFAULT_VIEW_MODE, readViewMode } from "../persistence/focusUiStorage.js";

// createFocusUi is a plain function (provide/inject live in the other two
// exports), so it is reachable without a component instance — which matters
// here, because this project's vitest has no DOM and no @vue/test-utils.

function stubLocalStorage(seed) {
  const map = new Map();
  if (seed) map.set("mindstream.focusUi.v1", JSON.stringify(seed));
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

describe("createFocusUi", () => {
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("starts collapsed on the default view with no storage", () => {
    const ui = createFocusUi();
    expect(ui.expanded).toBe(false);
    expect(ui.sessionActive).toBe(false);
    expect(ui.viewMode).toBe(DEFAULT_VIEW_MODE);
  });

  it("seeds viewMode from storage", () => {
    stubLocalStorage({ schemaVersion: 1, viewMode: "rail" });
    expect(createFocusUi().viewMode).toBe("rail");
  });

  it("toggleViewMode flips between the board and the rail", () => {
    const ui = createFocusUi();
    ui.toggleViewMode();
    expect(ui.viewMode).toBe("rail");
    ui.toggleViewMode();
    expect(ui.viewMode).toBe("stack");
  });

  it("setViewMode writes through to storage", () => {
    stubLocalStorage();
    const ui = createFocusUi();
    ui.setViewMode("rail");
    expect(readViewMode()).toBe("rail");
  });

  it("setViewMode ignores unknown modes", () => {
    const ui = createFocusUi();
    ui.setViewMode("kanban");
    expect(ui.viewMode).toBe(DEFAULT_VIEW_MODE);
  });

  it("hands out independent instances (widget must not share the route's expand)", () => {
    const a = createFocusUi();
    const b = createFocusUi();
    a.expanded = true;
    expect(b.expanded).toBe(false);
  });
});
