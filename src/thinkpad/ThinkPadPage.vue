<script setup>
import { toRef } from "vue";
import { storeToRefs } from "pinia";
import ThinkPadPanel from "./components/ThinkPadPanel.vue";
import IdeasPanel from "./components/IdeasPanel.vue";
import DraftPhaseBar from "./components/DraftPhaseBar.vue";
import DocumentPickerDialog from "./dialogs/DocumentPickerDialog.vue";
import { usePadStore } from "./store/padStore";
import { useSessionUi } from "./composables/useSessionUi";
import { useThinkPadSurface } from "./composables/useThinkPadSurface";
import { useThinkPadWelcome } from "./composables/useThinkPadWelcome";
import { useThinkPadReflect } from "./composables/useThinkPadReflect";

// US-Letter sheet at 96dpi; expand widens the sheet while keeping it centered.
const THINKPAD_PAGE_WIDTH = 816;
const THINKPAD_PAGE_MAX_HEIGHT = 1056;
const THINKPAD_EXPANDED_MAX_WIDTH = 1160;

const surface = useThinkPadSurface();
const sessionUi = useSessionUi();
const padStore = usePadStore();
const { currentPad: currentContext, isLoaded: padStoreIsLoaded, isDraftFrozen, currentPadId } = storeToRefs(padStore);

function handlePickerSelect(id) {
  surface.restoreResumableContext({ id });
  sessionUi.documentPickerOpen = false;
}

function handlePickerNew() {
  padStore.newBlankPad();
  sessionUi.documentPickerOpen = false;
}

const welcome = useThinkPadWelcome({ thinkPad: surface, sessionUi, isDraftFrozen });
const reflect = useThinkPadReflect({
  surface,
  sessionUi,
  isBlankPad: toRef(welcome, "isBlankPad"),
  dismissed: toRef(welcome, "dismissed"),
  peekOpen: toRef(surface, "peekOpen"),
});

const pageWidth = `${THINKPAD_PAGE_WIDTH}px`;
const pageMaxHeight = `${THINKPAD_PAGE_MAX_HEIGHT}px`;
const expandedMaxWidth = `${THINKPAD_EXPANDED_MAX_WIDTH}px`;
</script>

<template>
  <div class="thinkpad-page-layout fill-height d-flex flex-column min-h-0">
    <template v-if="currentContext">
      <div
        class="thinkpad-workspace d-flex flex-grow-1 min-h-0"
        :class="{ 'thinkpad-workspace--expanded': sessionUi.padExpanded }"
      >
        <div class="thinkpad-canvas flex-grow-1 min-h-0">
          <v-expand-transition mode="out-in">
            <div
              v-if="welcome.showRecentPanel"
              class="thinkpad-welcome"
            >
              <p class="thinkpad-welcome__heading text-overline text-medium-emphasis">Pick up where you left off</p>
              <div class="thinkpad-welcome__grid">
                <button
                  v-for="item in welcome.recentItems"
                  :key="item.contextId"
                  type="button"
                  class="thinkpad-doc-card"
                  @click="welcome.handleSelectRecent(item.contextId)"
                >
                  <span class="thinkpad-doc-card__page">
                    <span v-if="item.previewText" class="thinkpad-doc-card__preview">{{ item.previewText }}</span>
                    <span v-else class="thinkpad-doc-card__preview thinkpad-doc-card__preview--empty">Empty document</span>
                  </span>
                  <span class="thinkpad-doc-card__caption">
                    <span class="thinkpad-doc-card__title text-body-2">{{ item.title || 'Untitled' }}</span>
                    <span v-if="item.updatedAt" class="thinkpad-doc-card__date text-caption text-disabled">
                      {{ welcome.formatRelativeTime(item.updatedAt) }}
                    </span>
                  </span>
                </button>
              </div>  <ThinkPadAppBar />
  
            </div>
          </v-expand-transition>

          <div
            class="thinkpad-page-col"
            :class="{ 'thinkpad-page-col--expanded': sessionUi.padExpanded }"
          >
              <div
                v-if="!surface.isAtRoot"
                class="drill-bar"
                :class="{ 'drill-bar--expanded': sessionUi.padExpanded }"
              >
                <nav class="drill-bar__crumbs" aria-label="Thread breadcrumb">
                  <button type="button" class="drill-crumb" @click="surface.jumpToSurface(0)">
                    <v-icon icon="mdi-home-outline" size="14" />
                    <span class="drill-crumb__label">{{ currentContext.title || 'Document' }}</span>
                  </button>
                  <template v-for="(frame, i) in surface.threadPath" :key="frame.id">
                    <v-icon icon="mdi-chevron-right" size="13" class="drill-crumb__sep" />
                    <button
                      type="button"
                      class="drill-crumb"
                      :class="{ 'drill-crumb--current': i === surface.threadPath.length - 1 }"
                      :disabled="i === surface.threadPath.length - 1"
                      @click="surface.jumpToSurface(i + 1)"
                    >
                      <span class="drill-crumb__label">{{ frame.steps?.[0]?.title || 'Untitled' }}</span>
                    </button>
                  </template>
                </nav>
                <div class="drill-bar__goal">
                  <v-icon icon="mdi-target" size="14" class="drill-bar__goal-icon" />
                  <span class="text-medium-emphasis">Working on:</span>
                  <strong class="drill-bar__goal-text">{{ surface.currentGoal }}</strong>
                </div>
                <div class="drill-bar__actions">
                  <v-btn size="small" variant="text" prepend-icon="mdi-eye-outline" @click="surface.peekOpen = true">Peek parent</v-btn>
                  <v-btn size="small" variant="text" prepend-icon="mdi-arrow-up-left" @click="surface.handleAscend()">Back</v-btn>
                  <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-arrow-up-bold-box-outline" :disabled="!surface.canComplete" @click="surface.handleComplete()">Complete</v-btn>
                </div>
              </div>

              <div class="thinkpad-page-row">
              <div class="thinkpad-page-stack">
                <div
                  class="thinkpad-page"
                  :class="{ 'thinkpad-page--expanded': sessionUi.padExpanded }"
                  @pointerdown.capture="welcome.handleThinkPadFocus"
                >
                  <ThinkPadPanel
                    :key="`${currentContext.id}:${surface.surfaceHead ?? 'root'}:${padStore.viewingDraftN ?? 'live'}`"
                    class="thinkpad-page__panel"
                    :think-pad="reflect.displayThinkPad"
                    :pad-locator="surface.surfaceHead"
                    :title="surface.surfaceTitle"
                    :active="true"
                    :expanded="sessionUi.padExpanded"
                    :highlight-step-id="reflect.peekedStepId"
                    :drill-threads="surface.drillThreads"
                    :candidate-spans="reflect.candidateSpans"
                    :read-only="reflect.isDraftFrozen || padStore.isDraftHistoryView"
                    :reflect-mode="reflect.isDraftFrozen && !padStore.isDraftHistoryView"

                    @update:text="surface.handleThinkPadTextUpdate"
                    @update:title="surface.handleSurfaceTitleUpdate"
                    @extract-step="surface.handleExtractStep"
                    @drill-span="surface.handleDrillIntoSpan"
                    @tag-span="surface.handleTagAnnotation"
                    @hide-span="surface.handleHideSpan"
                    @reveal-hidden="surface.handleRevealHidden"
                    @focus="welcome.handleThinkPadFocus"

                    @reopen-drill="({ threadId }) => surface.navigateToThread(threadId)"
                    @reorder-block="({ fromIdx, toIdx, padLocator }) => padStore.reorderBlock({ padLocator, fromIdx, toIdx })"
                  >
                    <template v-if="!surface.isAtRoot" #title>
                      <blockquote class="thinkpad-quote">{{ surface.surfaceTitle }}</blockquote>
                    </template>
                    <template #footer>
                      <DraftPhaseBar />
                    </template>
                    <template #bar-end>
                      <IdeasPanel
                        v-if="reflect.isDraftFrozen && !padStore.isDraftHistoryView"
                        :items="reflect.ideas"
                        @peek="reflect.setPeekedStepId"
                      />
                    </template>
                  </ThinkPadPanel>
                </div>
              </div>
              </div>
          </div>
        </div>
      </div>

      <DocumentPickerDialog
        v-model="sessionUi.documentPickerOpen"
        :items="surface.padListItems"
        :active-id="currentPadId"
        @select="handlePickerSelect"
        @new="handlePickerNew"
        @delete="surface.handleDeleteDocument"
      />

      <v-dialog v-model="surface.peekOpen" max-width="760">
        <v-card class="peek-card">
          <v-card-title class="text-subtitle-1 d-flex align-center">
            <v-icon icon="mdi-eye-outline" size="18" class="me-2" />
            <span class="text-truncate">Parent · {{ surface.peekTitle }}</span>
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" size="small" @click="surface.peekOpen = false" />
          </v-card-title>
          <v-card-text class="peek-card__body">
            <ThinkPadPanel
              v-if="surface.peekOpen"
              :key="`peek:${surface.peekHighlightStepId}`"
              :think-pad="surface.peekPad"
              :embedded="true"
              :active="false"
              :read-only="true"
              :highlight-step-id="surface.peekHighlightStepId"
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </template>

    <div v-else class="d-flex align-center justify-center fill-height">
      <v-progress-circular v-if="!padStoreIsLoaded" indeterminate color="primary" />
    </div>
  </div>
</template>

<style scoped>
.thinkpad-page-layout {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.thinkpad-workspace {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  max-height: calc(100dvh - 100px);
  overflow: hidden;
}

.thinkpad-workspace--expanded {
  max-height: 100dvh;
}

.thinkpad-canvas {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: stretch;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  padding: clamp(16px, 4vh, 40px) clamp(12px, 4vw, 40px);
  padding-block-end: clamp(96px, 12vh, 128px);
  gap: 16px;
}

.thinkpad-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  max-height: min(v-bind(pageMaxHeight), 100%);
}

.thinkpad-page--expanded {
  max-height: min(v-bind(pageMaxHeight), 100%);
}

.thinkpad-page__panel {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.thinkpad-page-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.thinkpad-quote {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding-inline-start: 0.85rem;
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-style: italic;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.drill-bar {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding: 7px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.65);
}

.drill-bar--expanded {
  width: 100%;
}

.drill-bar__crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  min-width: 0;
}

.drill-crumb {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 22ch;
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.drill-crumb:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.drill-crumb:disabled {
  cursor: default;
}

.drill-crumb--current {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.drill-crumb__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drill-crumb__sep {
  color: rgba(var(--v-theme-on-surface), 0.3);
}

.drill-bar__goal {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  min-width: 0;
}

.drill-bar__goal-icon {
  color: rgb(var(--v-theme-primary));
}

.drill-bar__goal-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 36ch;
}

.drill-bar__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-inline-start: auto;
}

.peek-card__body {
  max-height: 60vh;
  overflow: auto;
}

.thinkpad-page-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1 1 auto;
  width: 100%;
  max-width: v-bind(pageWidth);
  margin-inline: auto;
  min-height: 0;
  min-width: 0;
  align-items: stretch;
}

.thinkpad-page-col--expanded {
  max-width: v-bind(expandedMaxWidth);
}

.thinkpad-page-row {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.thinkpad-welcome {
  width: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinkpad-welcome__heading {
  margin: 0;
}

.thinkpad-welcome__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.thinkpad-doc-card {
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

.thinkpad-doc-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.thinkpad-doc-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.thinkpad-doc-card__page {
  display: block;
  height: 120px;
  padding: 12px 12px 0;
  background: rgb(var(--v-theme-surface-bright));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.thinkpad-doc-card__preview {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: pre-wrap;
  color: rgb(var(--v-theme-on-surface-variant));
}

.thinkpad-doc-card__preview--empty {
  font-style: italic;
  opacity: 0.6;
}

.thinkpad-doc-card__caption {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px 10px;
}

.thinkpad-doc-card__title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkpad-doc-card__date {
  font-size: 0.7rem;
}

</style>
