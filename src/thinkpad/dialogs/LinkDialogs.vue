<script setup>
// Links (roadmap Revisions 15 and 22). Two small sheets:
// - "Link": attach a URL to the selected passage, or link it to another
//   paragraph (a snapshot connection that keeps that paragraph's text).
// - A link's sheet: open the URL, or read the paragraph as it was when linked,
//   with a note if it was later refined. Neither is an open item.
import { computed, ref, watch } from "vue";
import { usePadStore } from "../store/padStore";

const props = defineProps({
  /** The selection being linked: { selectionStart, selectionEnd, selectedText } or null. */
  pending: { type: Object, default: null },
  /** The annotation id of the link being viewed, or null. */
  viewingId: { type: String, default: null },
});
const emit = defineEmits(["close"]);
const padStore = usePadStore();

const url = ref("");
watch(() => props.pending, () => { url.value = ""; });
const urlOk = computed(() => /^https?:\/\/\S+$/i.test(url.value.trim()));

// Paragraphs on this level, except the one holding the selection.
const paragraphs = computed(() => {
  const ideas = (padStore.viewPad?.frozenIdeas ?? padStore.viewPad?.ideas ?? []).filter((i) => (i.text ?? "").trim());
  const p = props.pending;
  let offset = 0;
  return ideas
    .map((i) => { const start = offset; offset += i.text.length + 2; return { id: i.id, text: i.text, start, end: start + i.text.length }; })
    .filter((i) => !(p && p.selectionStart >= i.start && p.selectionEnd <= i.end));
});

function linkUrl() {
  if (!urlOk.value || !props.pending) return;
  padStore.addLink({ padLocator: padStore.surfaceHead, ...props.pending, href: url.value.trim() });
  emit("close");
}
function linkParagraph(id) {
  if (!props.pending) return;
  padStore.addPassageLink({ padLocator: padStore.surfaceHead, ...props.pending, targetIdeaId: id });
  emit("close");
}

const viewing = computed(() => padStore.linksOnSurface.find((l) => l.annotationId === props.viewingId) ?? null);
function remove() {
  padStore.removeLink({ padLocator: padStore.surfaceHead, annotationId: props.viewingId });
  emit("close");
}
</script>

<template>
  <v-dialog :model-value="!!pending" max-width="520" scrim="rgba(0,0,0,0.35)" @update:model-value="(v) => { if (!v) emit('close'); }">
    <v-card rounded="lg">
      <v-card-title class="px-6 pt-6 pb-1">Link “{{ pending?.selectedText }}”</v-card-title>
      <v-card-text class="px-6 py-3">
        <v-text-field
          v-model="url"
          label="Paste a link (a video, an article…)"
          variant="outlined"
          density="comfortable"
          hide-details
          autofocus
          inputmode="url"
          @keydown.enter.prevent="linkUrl"
        />
        <div class="d-flex justify-end mt-2">
          <v-btn color="primary" variant="flat" :disabled="!urlOk" @click="linkUrl">Link</v-btn>
        </div>
        <template v-if="paragraphs.length">
          <p class="link-dlg__or text-medium-emphasis">Or link it to another paragraph. The link keeps that paragraph as it reads now.</p>
          <button v-for="p in paragraphs" :key="p.id" type="button" class="link-dlg__para" @click="linkParagraph(p.id)">
            {{ p.text }}
          </button>
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog :model-value="!!viewing" max-width="520" scrim="rgba(0,0,0,0.35)" @update:model-value="(v) => { if (!v) emit('close'); }">
    <v-card v-if="viewing" rounded="lg">
      <v-card-title class="px-6 pt-6 pb-1">“{{ viewing.selectedText }}”</v-card-title>
      <v-card-text class="px-6 py-3">
        <template v-if="viewing.kind === 'url'">
          <p class="link-dlg__href">{{ viewing.href }}</p>
        </template>
        <template v-else>
          <p class="text-medium-emphasis link-dlg__label">
            {{ viewing.quote ? "Quoted from" : "Linked to" }}{{ viewing.draftN != null ? ` draft ${viewing.draftN + 1}` : "" }}:
          </p>
          <blockquote class="link-dlg__quote">{{ viewing.snapshot }}</blockquote>
          <p v-if="viewing.lost && viewing.quote" class="text-medium-emphasis link-dlg__label">The draft has moved on since; the quote keeps the passage as it was.</p>
          <p v-else-if="viewing.lost" class="link-dlg__note">That paragraph is no longer in the draft. The link keeps it as it was.</p>
          <template v-else-if="viewing.refined">
            <p class="link-dlg__note">That paragraph was refined later. It now reads:</p>
            <blockquote class="link-dlg__quote link-dlg__quote--now">{{ viewing.current }}</blockquote>
            <p class="text-medium-emphasis link-dlg__label">Does the connection still hold?</p>
          </template>
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-btn variant="text" color="error" @click="remove">Remove link</v-btn>
        <v-spacer />
        <v-btn v-if="viewing.kind === 'url'" color="primary" variant="flat" :href="viewing.href" target="_blank" rel="noopener">Open</v-btn>
        <v-btn v-else variant="text" @click="emit('close')">Done</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.link-dlg__or { margin: 18px 0 8px; font-size: 0.85rem; }
.link-dlg__para {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-bottom: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
}
.link-dlg__para:hover { border-color: rgb(var(--v-theme-primary)); }
.link-dlg__href { word-break: break-all; font-size: 0.9rem; }
.link-dlg__label { margin: 0 0 4px; font-size: 0.85rem; }
.link-dlg__quote {
  margin: 0 0 10px;
  padding-inline-start: 0.85rem;
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-style: italic;
}
.link-dlg__quote--now { border-inline-start-color: rgba(var(--v-theme-warning), 0.7); }
.link-dlg__note { margin: 0 0 6px; font-size: 0.85rem; color: rgb(var(--v-theme-warning)); }
</style>
