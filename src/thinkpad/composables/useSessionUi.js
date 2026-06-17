import { reactive } from "vue";

/** ThinkPad page chrome — expand mode and document picker; read by ThinkPadLayout. */
const sessionUi = reactive({
  padExpanded: false,
  documentPickerOpen: false,
});

export function useSessionUi() {
  return sessionUi;
}
