import { reactive, provide, inject } from "vue";
import {
  DEFAULT_VIEW_MODE,
  isViewMode,
  readViewMode,
  writeViewMode,
} from "../persistence/focusUiStorage.js";

const FOCUS_UI_KEY = Symbol("focusUi");

/**
 * Focus chrome state — expand mode + which context view is showing. One
 * instance per hosting context: the app shell provides one for the standalone
 * /focus route (App.vue reads it to hide the app bar), and a dashboard widget
 * host provides its own, shadowing the app-level instance for the widget
 * subtree so expand never leaks across contexts.
 *
 * `viewMode` ("stack" board | "rail") is seeded from localStorage and written
 * through on change. Both instances read the same key, so both START on the
 * persisted mode; because they are separate objects, toggling inside the
 * dashboard widget does not update the already-created route instance until
 * the next reload. Accepted: it's a preference, it self-corrects on reload,
 * and the route and the widget are never mounted at the same time anyway.
 */
export function createFocusUi() {
  return reactive({
    expanded: false,
    /** True while a focus session is running; the app shell hides launcher chrome. */
    sessionActive: false,
    viewMode: readViewMode(),

    /** Switch the context view and remember it. Unknown values are ignored. */
    setViewMode(mode) {
      if (!isViewMode(mode) || mode === this.viewMode) return;
      this.viewMode = mode;
      writeViewMode(mode);
    },

    /** Flip between the stack board and the rail. */
    toggleViewMode() {
      this.setViewMode(this.viewMode === "stack" ? "rail" : "stack");
    },
  });
}

/** Create a fresh instance and provide it to descendants; returns it. */
export function provideFocusUi() {
  const focusUi = createFocusUi();
  provide(FOCUS_UI_KEY, focusUi);
  return focusUi;
}

/** Inject the nearest provided instance (fresh fallback if none). */
export function useFocusUi() {
  return inject(FOCUS_UI_KEY, createFocusUi, true);
}

export { DEFAULT_VIEW_MODE };
