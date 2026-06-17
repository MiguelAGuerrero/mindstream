import { onMounted } from "vue";
import { usePadStore } from "../store/padStore";

/** Pad bootstrap — runs when the ThinkPad route layout mounts. */
export function useThinkPadBootstrap() {
  const padStore = usePadStore();

  onMounted(async () => {
    if (!padStore.isLoaded) await padStore.loadPads();
    padStore.ensureBlankPad();
  });
}
