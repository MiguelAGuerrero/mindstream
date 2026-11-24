import { reactive, provide, inject } from "vue";

const SESSION_UI_KEY = Symbol("sessionUi");

/**
 * ThinkPad chrome state — pad expand + document picker. One instance per
 * hosting context: ThinkPadLayout provides one for the standalone /thinkpad
 * route, ThinkPadWidgetHost provides its own for the dashboard widget, so
 * expand/picker state never leaks across contexts.
 */
export function createSessionUi() {
  return reactive({
    padExpanded: false,
    documentPickerOpen: false,
  });
}

/** Create a fresh instance and provide it to descendants; returns it. */
export function provideSessionUi() {
  const sessionUi = createSessionUi();
  provide(SESSION_UI_KEY, sessionUi);
  return sessionUi;
}

/** Inject the nearest provided instance (fresh fallback if none). */
export function useSessionUi() {
  return inject(SESSION_UI_KEY, createSessionUi, true);
}
