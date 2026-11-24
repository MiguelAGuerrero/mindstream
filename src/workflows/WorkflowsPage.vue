<script setup>
// Workflows (route name: "workflows"). One page, three views:
//   pick    another tool asked for steps (/workflows?handoff=<id>)
//   editor  one workflow (/workflows?id=<id>)
//   library everything else
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWorkflowStore } from "./store/workflowStore.js";
import { useWorkflowsHandoff } from "./composables/useWorkflowsHandoff.js";
import WorkflowLibrary from "./components/WorkflowLibrary.vue";
import WorkflowEditor from "./components/WorkflowEditor.vue";
import WorkflowPicker from "./components/WorkflowPicker.vue";

const route = useRoute();
const router = useRouter();
const workflows = useWorkflowStore();
const handoff = useWorkflowsHandoff();

onMounted(() => workflows.load());

const editingId = computed(() => (typeof route.query.id === "string" ? route.query.id : null));
const editing = computed(() => (editingId.value ? workflows.byId(editingId.value) : null));

function open(id) {
  router.push({ name: "workflows", query: { id } });
}
function openNew() {
  open(workflows.create().id);
}
function backToLibrary() {
  router.push({ name: "workflows" });
}
function removeAndBack(id) {
  workflows.remove(id);
  backToLibrary();
}
</script>

<template>
  <v-main>
    <v-container class="py-8 workflows-page" style="max-width: 880px">
      <template v-if="workflows.isLoaded">
        <WorkflowPicker
          v-if="handoff.pickRequest.value"
          :request="handoff.pickRequest.value"
          :requester-name="handoff.requesterName.value"
          :workflows="workflows.library"
          @choose="handoff.choose"
          @cancel="handoff.cancelPick"
        />
        <WorkflowEditor
          v-else-if="editing"
          :key="editing.id"
          :workflow="editing"
          :can-run="handoff.canRun.value"
          @update="(patch) => workflows.update(editing.id, patch)"
          @back="backToLibrary"
          @delete="removeAndBack(editing.id)"
          @run="handoff.runAsContext(editing.id)"
        />
        <WorkflowLibrary v-else :workflows="workflows.library" @open="open" @new="openNew" />
      </template>
    </v-container>
  </v-main>
</template>
