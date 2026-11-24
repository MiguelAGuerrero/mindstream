import { onMounted } from "vue";
import { useSessionRunStore } from "../store/sessionRunStore";

/** Focus bootstrap — hydrates persisted contexts; runs wherever the runner
 *  mounts (standalone /focus route or the dashboard widget). Idempotent. */
export function useFocusBootstrap() {
  const runStore = useSessionRunStore();

  onMounted(async () => {
    if (!runStore.isLoaded) await runStore.loadContexts();
  });
}
