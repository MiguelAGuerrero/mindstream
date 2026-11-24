<script setup>
// ---------------------------------------------------------------------------
// DocumentPickerDialog — the centered "Open…" modal for switching think-pads.
//
// A document == a Context. This is a thin, presentational dialog over the
// already-projected pool (`resumableSessionItems`); it owns no store state and
// emits intent up to ThinkPadPage (select / new / delete). Parent-controlled via
// v-model, matching the other dialogs in this folder.
//
// Documents render as a Google-Docs-style card grid: each card is a glimpse of
// the think-pad text on a tinted "page", captioned with the title and creation
// date. The grid scrolls within a height-capped, fixed-width dialog so it stays
// a contained "context" surface rather than a full page.
// ---------------------------------------------------------------------------
import { computed, ref, watch } from "vue";
import { formatRelativeTime } from "../utils/formatRelativeTime";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Document list — the shape of MainLayout's `resumableSessionItems`. */
  items: { type: Array, default: () => [] },
  /** contextId of the currently-open document (highlighted in the grid). */
  activeId: { type: String, default: null },
});

const emit = defineEmits(["update:modelValue", "select", "new", "delete"]);

const query = ref("");

// Clear the search each time the dialog opens.
watch(
  () => props.modelValue,
  (open) => {
    if (open) query.value = "";
  },
);

// No title: name the pad by its first words, so untitled pads can be told apart.
function docTitle(item) {
  const title = (item.rootTitle || item.activeTitle || "").trim();
  if (title) return title;
  const words = (item.previewText || "").replace(/\s+/g, " ").trim();
  if (!words) return "Untitled";
  return words.length > 48 ? `${words.slice(0, 47).trimEnd()}…` : words;
}

// Empty pads (nothing written, no title) are left out, except the one open now.
const listed = computed(() =>
  props.items.filter((item) => item.id === props.activeId || (item.previewText || "").trim() || (item.rootTitle || item.activeTitle || "").trim()),
);

// Items already arrive newest-first (contextPool). Filter client-side by title.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return listed.value;
  return listed.value.filter((item) => docTitle(item).toLowerCase().includes(q));
});

// Deleting asks first, on the card itself: one tap never loses a pad.
const confirmId = ref(null);
watch(() => props.modelValue, () => { confirmId.value = null; });
function confirmDelete(id) {
  emit("delete", id);
  confirmId.value = null;
}

/** Flat think-pad text → a short card glimpse for the picker grid. */
function truncatePreview(text, max = 280) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    scrim="rgba(0,0,0,0.5)"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="lg" class="dialog-card">
      <v-card-title class="text-subtitle-1 dialog-title">Open a document</v-card-title>

      <!-- Empty pool: a single, prominent call-to-action to create the first file. -->
      <div v-if="!items.length" class="dialog-empty-state">
        <v-icon size="40" class="dialog-empty-state__icon">mdi-file-document-plus-outline</v-icon>
        <div class="text-body-1 mb-1">No documents yet</div>
        <div class="text-body-2 text-disabled mb-4">
          Create your first think-pad to get started.
        </div>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="emit('new')">
          New think-pad
        </v-btn>
      </div>

      <!-- Populated pool: search + a scrollable grid of document cards. -->
      <template v-else>
        <div class="dialog-search">
          <v-text-field
            v-model="query"
            density="compact"
            variant="outlined"
            hide-details
            placeholder="Search documents…"
            prepend-inner-icon="mdi-magnify"
            autofocus
          />
        </div>

        <div class="doc-grid-scroll">
          <div class="doc-grid">
            <!-- New tile: always first, survives filtering. -->
            <button type="button" class="doc-card doc-card--new" @click="emit('new')">
              <v-icon size="28">mdi-plus</v-icon>
              <span class="text-body-2">New think-pad</span>
            </button>

            <button
              v-for="item in filtered"
              :key="item.id"
              type="button"
              class="doc-card"
              :class="{ 'doc-card--active': item.id === activeId }"
              :aria-current="item.id === activeId ? 'true' : undefined"
              @click="emit('select', item.id)"
            >
              <v-btn
                class="doc-card__delete"
                icon="mdi-delete-outline"
                variant="text"
                size="x-small"
                density="comfortable"
                aria-label="Delete document"
                @click.stop="confirmId = item.id"
              />
              <span v-if="confirmId === item.id" class="doc-card__confirm" @click.stop>
                <span class="text-body-2">Delete “{{ docTitle(item) }}”? This can't be undone.</span>
                <span class="doc-card__confirm-actions">
                  <v-btn size="small" variant="text" @click.stop="confirmId = null">Keep</v-btn>
                  <v-btn size="small" variant="flat" color="error" @click.stop="confirmDelete(item.id)">Delete</v-btn>
                </span>
              </span>

              <span class="doc-card__page">
                <span v-if="item.previewText" class="doc-card__preview">{{ truncatePreview(item.previewText) }}</span>
                <span v-else class="doc-card__preview doc-card__preview--empty">Empty document</span>
              </span>

              <span class="doc-card__caption">
                <span class="doc-card__title text-body-2">{{ docTitle(item) }}</span>
                <span
                  v-if="item.createdAt"
                  class="doc-card__date text-caption text-disabled"
                >
                  Created {{ formatRelativeTime(item.createdAt) }}
                </span>
              </span>
            </button>

            <div v-if="!filtered.length" class="doc-grid__empty text-body-2 text-disabled">
              No matches
            </div>
          </div>
        </div>
      </template>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card {
  padding: 0;
}

.dialog-title {
  padding: 1.5rem 1.5rem 0;
  text-align: left;
}

.dialog-search {
  padding: 1rem 1.5rem 0;
}

/* Scroll container — height-capped so the dialog never feels page-like. */
.doc-grid-scroll {
  padding: 1rem 1.5rem;
  max-height: min(60vh, 460px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
  align-items: stretch;
}

.doc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  transition: background-color 0.13s ease, border-color 0.13s ease, box-shadow 0.13s ease;
}

.doc-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.doc-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

/* Currently-open document. */
.doc-card--active {
  border-color: rgba(var(--v-theme-primary), 0.55);
  background: rgba(var(--v-theme-primary), 0.06);
}

/* Tinted "page" evoking a mini document thumbnail. */
.doc-card__page {
  display: block;
  height: 120px;
  padding: 12px 12px 0;
  background: rgb(var(--v-theme-surface-bright));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.doc-card__preview {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: pre-wrap;
  color: rgb(var(--v-theme-on-surface-variant));
}

.doc-card__preview--empty {
  font-style: italic;
  opacity: 0.6;
}

.doc-card__caption {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px 10px;
}

.doc-card__title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-card__date {
  font-size: 0.7rem;
}

/* New tile: dashed, centered plus. */
.doc-card--new {
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 120px;
  padding: var(--space-3);
  border-style: dashed;
  border-color: rgba(var(--v-border-color), calc(var(--v-border-opacity) * 1.6));
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  box-shadow: none;
}

.doc-card--new:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.06);
}

/* Delete — hidden until hover/focus, keyboard-reachable. */
.doc-card__delete {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.doc-card:hover .doc-card__delete,
.doc-card:focus-within .doc-card__delete,
.doc-card__delete:focus-visible {
  opacity: 1;
}

.doc-grid__empty {
  grid-column: 1 / -1;
  padding: var(--space-2) 0;
  text-align: center;
}

.dialog-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1.5rem 1rem;
}

.dialog-empty-state__icon {
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.dialog-actions {
  padding: 1rem 1.5rem 1.5rem;
  gap: var(--space-1);
}

.doc-card__confirm {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: inherit;
  background: rgb(var(--v-theme-surface));
  text-align: left;
  cursor: default;
}

.doc-card__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
