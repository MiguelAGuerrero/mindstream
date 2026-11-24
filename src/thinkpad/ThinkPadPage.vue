<script setup>
import { toRef, ref, watch, nextTick } from "vue";
import { useDisplay } from "vuetify";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import ThinkPadPanel from "./components/ThinkPadPanel.vue";
import DraftPhaseBar from "./components/DraftPhaseBar.vue";
import RevisionHistoryDrawer from "./components/RevisionHistoryDrawer.vue";
import LinkDialogs from "./dialogs/LinkDialogs.vue";
import SendSheet from "../shelf/SendSheet.vue";
import { useWorkflowSlot } from "./composables/useWorkflowSlot";
import DocumentPickerDialog from "./dialogs/DocumentPickerDialog.vue";
import OpenItemsDialog from "./dialogs/OpenItemsDialog.vue";
import { usePadStore } from "./store/padStore";
import { useSessionUi } from "./composables/useSessionUi";
import { useThinkPadSurface } from "./composables/useThinkPadSurface";
import { useThinkPadWelcome } from "./composables/useThinkPadWelcome";
import { useThinkPadReflect } from "./composables/useThinkPadReflect";
import { useFocusHandoff } from "./composables/useFocusHandoff";

// US-Letter sheet at 96dpi; expand widens the sheet while keeping it centered.
const THINKPAD_PAGE_WIDTH = 816;
const THINKPAD_PAGE_MAX_HEIGHT = 1056;
const THINKPAD_EXPANDED_MAX_WIDTH = 1160;

const surface = useThinkPadSurface();
const sessionUi = useSessionUi();
// Phones: the welcome is a document list with a + button; the question is
// asked in a dialog instead of a full-screen prompt (Revision 33).
const { smAndDown } = useDisplay();
const padStore = usePadStore();
const { currentPad: currentContext, isLoaded: padStoreIsLoaded, isDraftFrozen, currentPadId } = storeToRefs(padStore);

// Deep link from the workspace's open loops (Phase 4): ?pad=…&thread=… lands on
// that exact place, then the query is dropped so a reload does not repeat it.
const route = useRoute();
const router = useRouter();
watch(
  [() => route.query.pad, padStoreIsLoaded],
  ([padId, loaded]) => {
    if (!loaded || typeof padId !== "string" || !padId) return;
    if (padStore.setActivePad(padId)) {
      const thread = route.query.thread;
      padStore.navigateToThread(typeof thread === "string" && thread ? thread : null);
    }
    const { pad: _p, thread: _t, ...rest } = route.query;
    router.replace({ name: "thinkpad", query: rest });
  },
  { immediate: true },
);

function handlePickerSelect(id) {
  surface.restoreResumableContext({ id });
  sessionUi.documentPickerOpen = false;
}

function handlePickerNew() {
  padStore.newBlankPad();
  sessionUi.documentPickerOpen = false;
}

const focusHandoff = useFocusHandoff({ surface, currentContext });
const welcome = useThinkPadWelcome({ thinkPad: surface, sessionUi, isDraftFrozen });
const reflect = useThinkPadReflect({
  surface,
  sessionUi,
  isBlankPad: toRef(welcome, "isBlankPad"),
  dismissed: toRef(welcome, "dismissed"),
  peekOpen: toRef(surface, "peekOpen"),
});

// Focus the question field whenever the blank-pad prompt appears (cold start or
// returning to a fresh pad) so the user can answer without reaching for the mouse.
const questionInputRef = ref(null);
watch(
  () => welcome.showQuestionPrompt,
  (show) => {
    if (show) nextTick(() => questionInputRef.value?.focus());
  },
  { immediate: true },
);

const pageWidth = `${THINKPAD_PAGE_WIDTH}px`;
const pageMaxHeight = `${THINKPAD_PAGE_MAX_HEIGHT}px`;
const expandedMaxWidth = `${THINKPAD_EXPANDED_MAX_WIDTH}px`;

const drillContextExpanded = ref(false);
const resolveFieldRef = ref(null);
// Links: the selection being linked, and the link whose sheet is open.
const linkPending = ref(null);
const quoteOpen = ref(false);
const sendText = ref("");
// The thread's source passage starts shortened each time a thread opens.
const quoteExpanded = ref(false);
watch(() => surface.surfaceHead, () => { quoteExpanded.value = false; });
const workflowSlot = useWorkflowSlot();
const tagLabel = (tag) => ({ question: "Question", expand: "Expand", converge: "Flag" })[tag] ?? tag;
const viewingLinkId = ref(null);

watch(
  () => surface.resolveDialog.open,
  (open) => {
    if (open) nextTick(() => resolveFieldRef.value?.focus?.());
  },
);

// Notices close on their own timer (see the template).
let leftOpenTimer = null;
watch(() => surface.leftOpen, (v) => {
  clearTimeout(leftOpenTimer);
  if (v) leftOpenTimer = setTimeout(() => { surface.leftOpen = null; }, 4000);
});
let draftReadyTimer = null;
watch(() => padStore.studyBeat, (v) => {
  clearTimeout(draftReadyTimer);
  if (v) draftReadyTimer = setTimeout(() => padStore.dismissStudyBeat(), 5000);
});
// Leaving a thread clears a notice about the level you just left.
watch(() => surface.surfaceHead, () => { if (surface.leftOpen && surface.leftOpen.threadId === surface.surfaceHead) surface.leftOpen = null; });

// New (the + button or the menu) may land on a blank pad you had already
// started writing in; asking again brings its welcome back, so cancelling the
// dialog leaves you on the list rather than on an empty page.
watch(
  () => sessionUi.newPadDialogOpen,
  (open) => {
    if (open && welcome.isBlankPad) welcome.dismissed = false;
  },
);

watch(
  () => surface.surfaceHead,
  () => { drillContextExpanded.value = false; },
);
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
              v-if="welcome.showRecentPanel || (smAndDown && welcome.showQuestionPrompt)"
              class="thinkpad-welcome"
            >
              <p v-if="welcome.recentItems.length" class="thinkpad-welcome__heading text-overline text-medium-emphasis">Pick up where you left off</p>
              <p v-else class="thinkpad-welcome__empty text-body-2 text-medium-emphasis">No think-pads yet. Tap + to start one.</p>
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
                  <v-icon class="thinkpad-doc-card__icon" icon="mdi-file-document-outline" size="22" />
                  <span class="thinkpad-doc-card__caption">
                    <span class="thinkpad-doc-card__title text-body-2">{{ item.title || 'Untitled' }}</span>
                    <span v-if="item.updatedAt" class="thinkpad-doc-card__date text-caption text-disabled">
                      {{ welcome.formatRelativeTime(item.updatedAt) }}
                    </span>
                    <span v-if="item.whereLeft" class="thinkpad-doc-card__date text-caption text-disabled">
                      In: {{ item.whereLeft }}
                    </span>
                    <!-- Phones: when and where on one line (the list has no preview). -->
                    <span v-if="item.updatedAt || item.whereLeft" class="thinkpad-doc-card__meta text-caption text-disabled">
                      {{ [item.updatedAt ? welcome.formatRelativeTime(item.updatedAt) : "", item.whereLeft ? `In: ${item.whereLeft}` : ""].filter(Boolean).join(" · ") }}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </v-expand-transition>

          <div v-if="welcome.showQuestionPrompt" class="thinkpad-prompt">
            <template v-if="smAndDown">
              <!-- Phones: one + where the thumb is; it asks the question in a dialog. -->
              <v-btn
                class="thinkpad-new-fab"
                icon="mdi-plus"
                color="primary"
                size="large"
                elevation="4"
                aria-label="New think-pad"
                title="New think-pad"
                @click="sessionUi.newPadDialogOpen = true"
              />
              <v-dialog v-model="sessionUi.newPadDialogOpen" max-width="440">
                <v-card class="thinkpad-new-dialog">
                  <v-card-title class="text-subtitle-1 pt-4">New think-pad</v-card-title>
                  <v-card-text class="pb-1">
                    <form @submit.prevent="sessionUi.newPadDialogOpen = false; welcome.submitQuestion()">
                      <v-text-field
                        v-model="welcome.questionDraft"
                        label="What question are you trying to answer?"
                        variant="outlined"
                        density="comfortable"
                        autofocus
                        hide-details
                        autocomplete="off"
                      />
                    </form>
                  </v-card-text>
                  <v-card-actions class="px-4 pb-3">
                    <v-btn variant="text" @click="sessionUi.newPadDialogOpen = false; welcome.handleThinkPadFocus()">Just start writing</v-btn>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      variant="flat"
                      :disabled="!welcome.questionDraft.trim()"
                      @click="sessionUi.newPadDialogOpen = false; welcome.submitQuestion()"
                    >Create</v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>
            </template>
            <div v-else class="thinkpad-prompt__inner">
              <p class="thinkpad-prompt__eyebrow text-overline text-medium-emphasis">New think-pad</p>
              <h1 class="thinkpad-prompt__heading">What question are you trying to answer?</h1>
              <form class="thinkpad-prompt__form" @submit.prevent="welcome.submitQuestion">
                <input
                  ref="questionInputRef"
                  v-model="welcome.questionDraft"
                  type="text"
                  class="thinkpad-prompt__input"
                  placeholder="Type your question…"
                  aria-label="What question are you trying to answer?"
                  autocomplete="off"
                  autofocus
                />
                <button
                  type="submit"
                  class="thinkpad-prompt__submit"
                  :disabled="!welcome.questionDraft.trim()"
                  aria-label="Start writing"
                >
                  <v-icon icon="mdi-arrow-right" size="20" />
                </button>
              </form>
              <button type="button" class="thinkpad-prompt__skip" @click="welcome.handleThinkPadFocus">
                or just start writing
              </button>
            </div>
          </div>

          <div
            v-else
            class="thinkpad-page-col"
            :class="{ 'thinkpad-page-col--expanded': sessionUi.padExpanded }"
          >
              <div
                v-if="!surface.isAtRoot"
                class="drill-bar"
                :class="{
                  'drill-bar--expanded': sessionUi.padExpanded,
                  'drill-bar--context-open': drillContextExpanded,
                }"
              >
                <button
                  type="button"
                  class="drill-bar__intent"
                  :aria-expanded="drillContextExpanded"
                  :aria-label="`Show thread path — ${surface.currentStance.label}`"
                  @click="drillContextExpanded = !drillContextExpanded"
                >
                  <v-icon
                    :icon="drillContextExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    size="16"
                    class="drill-bar__intent-chevron"
                  />
                  <span
                    v-if="surface.currentStance.symbol"
                    class="drill-bar__move-symbol"
                    aria-hidden="true"
                  >{{ surface.currentStance.symbol }}</span>
                  <v-icon
                    :icon="surface.currentStance.icon"
                    size="16"
                    class="drill-bar__stance-icon"
                  />
                  <span class="drill-bar__intent-text">{{ surface.currentStance.label }}</span>
                </button>

                <v-expand-transition>
                  <nav
                    v-if="drillContextExpanded"
                    class="drill-bar__thread"
                    aria-label="Thread path"
                    @click.stop
                  >
                    <button type="button" class="drill-crumb" @click="surface.jumpToSurface(0)">
                      <v-icon icon="mdi-home-outline" size="14" />
                      <span class="drill-crumb__label">{{ currentContext.title || 'Document' }}</span>
                        <span v-if="surface.openCountAt(null)" class="drill-crumb__open">· {{ surface.openCountAt(null) }} open</span>
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
                        <span v-if="surface.openCountAt(frame.id)" class="drill-crumb__open">· {{ surface.openCountAt(frame.id) }} open</span>
                      </button>
                    </template>
                    <button
                      type="button"
                      class="drill-bar__peek"
                      @click="surface.peekOpen = true"
                    >
                      <v-icon icon="mdi-eye-outline" size="14" />
                      Peek parent
                    </button>
                    <!-- Tag this thread's passage. Works by tap, since touch has no
                         hover to reach the tag picker on the passage itself. -->
                    <div v-if="surface.currentAnchor" class="drill-bar__tags" role="group" aria-label="Tag this thread">
                      <button
                        v-for="t in surface.tagChoices"
                        :key="t.id"
                        type="button"
                        class="drill-bar__tag"
                        :class="{ 'drill-bar__tag--on': surface.currentAnchor.tag === t.id }"
                        :aria-pressed="surface.currentAnchor.tag === t.id"
                        @click="surface.setCurrentTag(t.id)"
                      >{{ t.glyph }} {{ t.label }}</button>
                    </div>
                  </nav>
                </v-expand-transition>

                <div class="drill-bar__actions" @click.stop>
                  <v-chip
                    v-if="focusHandoff.focusSummary.value"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-timer-outline"
                    :title="focusHandoff.focusSummary.value.reflection || undefined"
                  >{{ focusHandoff.focusSummary.value.label }}</v-chip>
                  <v-btn v-if="focusHandoff.canFocus.value" class="drill-bar__btn--squeeze" size="small" variant="text" prepend-icon="mdi-timer" title="Focus on this" aria-label="Focus on this" @click="focusHandoff.focusOnThisMove()">Focus on this</v-btn>
                  <v-btn class="drill-bar__btn--squeeze" size="small" variant="text" prepend-icon="mdi-arrow-up-left" title="Back" aria-label="Back" @click="surface.handleAscend()">Back</v-btn>
                  <!-- The title sits on a wrapper: a disabled button gets no hover (D2). -->
                  <span :title="surface.canResolve ? undefined : 'Nothing to resolve yet. Write in this thread first.'">
                    <v-btn
                      size="small"
                      :color="surface.openItems.length ? 'warning' : 'primary'"
                      :variant="surface.openItems.length ? 'tonal' : 'flat'"
                      prepend-icon="mdi-arrow-up-bold-box-outline"
                      :disabled="!surface.canResolve"
                      @click="surface.handleResolve()"
                    >
                      {{ surface.openItems.length ? `Resolve · ${surface.openItems.length} open` : "Resolve" }}
                    </v-btn>
                  </span>
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
                    :staged-ideas="padStore.isDraftHistoryView ? [] : reflect.ideas"
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
                    @idea-peek="reflect.setPeekedStepId"
                    @link-span="(span) => { linkPending = span; }"
                    @source-span="(span) => padStore.markNeedsSource({ padLocator: surface.surfaceHead, ...span })"
                    @open-link="({ annotationId }) => { viewingLinkId = annotationId; }"
                    @send-span="({ selectedText }) => { sendText = selectedText; }"
                  >
                    <template v-if="!surface.isAtRoot" #title>
                      <!-- The passage this thread was opened on. Clamped to three lines so a
                           long passage leaves room to write; tap to read it all. -->
                      <blockquote
                        class="thinkpad-quote"
                        :class="{ 'thinkpad-quote--clamped': !quoteExpanded }"
                        role="button"
                        tabindex="0"
                        :aria-expanded="quoteExpanded"
                        :title="quoteExpanded ? 'Tap to shorten' : 'Tap to read the whole passage'"
                        @click="quoteExpanded = !quoteExpanded"
                        @keydown.enter.prevent="quoteExpanded = !quoteExpanded"
                      >{{ surface.surfaceTitle }}</blockquote>
                    </template>
                    <template #footer>
                      <DraftPhaseBar />
                    </template>
                    <template #bar-end>
                      <!-- Synthesize (Revisions 19-22): one thread over the whole draft. -->
                      <button
                        v-if="isDraftFrozen && !padStore.isDraftHistoryView && !padStore.isSynthesisSurface"
                        type="button"
                        class="thinkpad-bar-action"
                        title="Synthesize — work this whole draft into one thesis"
                        @click="padStore.startSynthesis()"
                      >
                        <v-icon icon="mdi-set-merge" size="14" />
                        <span>Synthesize</span>
                      </button>
                      <!-- A tag's shortcut (Revision 29): one tap writes its steps in. -->
                      <button
                        v-if="!surface.isAtRoot && surface.currentAnchor?.tag && padStore.tagShortcuts[surface.currentAnchor.tag] && !padStore.isDraftHistoryView"
                        type="button"
                        class="thinkpad-bar-action"
                        :title="`Use the ${tagLabel(surface.currentAnchor.tag)} shortcut: ${padStore.tagShortcuts[surface.currentAnchor.tag].label}`"
                        @click="padStore.applyTagShortcut({ tag: surface.currentAnchor.tag, threadId: surface.surfaceHead })"
                      >
                        <v-icon icon="mdi-lightning-bolt-outline" size="14" />
                        <span>{{ padStore.tagShortcuts[surface.currentAnchor.tag].label }}</span>
                      </button>
                      <!-- Offer the workflow just brought in as this tag's shortcut. -->
                      <button
                        v-if="!surface.isAtRoot && surface.currentAnchor?.tag && padStore.lastSlot?.threadId === surface.surfaceHead && padStore.tagShortcuts[surface.currentAnchor.tag]?.label !== padStore.lastSlot?.label"
                        type="button"
                        class="thinkpad-bar-action"
                        @click="padStore.declareTagShortcut(surface.currentAnchor.tag)"
                      >
                        <v-icon icon="mdi-pin-outline" size="14" />
                        <span>Make it the {{ tagLabel(surface.currentAnchor.tag) }} shortcut</span>
                      </button>
                      <!-- Slot a workflow into this thread: its steps come back as headings. -->
                      <button
                        v-if="!surface.isAtRoot && !padStore.isSynthesisSurface && !padStore.isDraftHistoryView && workflowSlot.canUseWorkflow.value"
                        type="button"
                        class="thinkpad-bar-action"
                        title="Use a workflow here: choose saved steps, written into this thread"
                        @click="workflowSlot.useWorkflow({ threadId: surface.surfaceHead, title: surface.currentGoal })"
                      >
                        <v-icon icon="mdi-format-list-numbered" size="14" />
                        <span>Workflow</span>
                      </button>
                      <button
                        v-if="padStore.isSynthesisSurface && !isDraftFrozen && padStore.quoteSources.length"
                        type="button"
                        class="thinkpad-bar-action"
                        title="Quote a paragraph of the draft"
                        @click="quoteOpen = true"
                      >
                        <v-icon icon="mdi-format-quote-open" size="14" />
                        <span>Quote</span>
                      </button>
                    </template>
                  </ThinkPadPanel>
                </div>
              </div>
              </div>
          </div>
        </div>
      </div>

      <RevisionHistoryDrawer />

      <!-- A new draft just landed (Revision 34): say so briefly and point at the
           history, instead of the old before / after card. -->
      <v-snackbar
        :model-value="!!padStore.studyBeat && !padStore.isDraftHistoryView"
        :timeout="-1"
        location="bottom"
        content-class="ms-raised-notice"
        @update:model-value="(v) => { if (!v) padStore.dismissStudyBeat(); }"
      >
        <template v-if="padStore.studyBeat">Draft {{ padStore.studyBeat.n + 1 }} is ready.</template>
        <template #actions>
          <v-btn variant="text" color="primary" @click="padStore.dismissStudyBeat(); sessionUi.historyOpen = true">History</v-btn>
        </template>
      </v-snackbar>

      <!-- Notices sit just above the Write / Reflect bar, never over the thread
           strip (Back, Resolve). They close on their own timer, which a finger
           resting on them can't hold open. -->
      <v-snackbar
        :model-value="!!surface.leftOpen"
        :timeout="-1"
        location="bottom"
        content-class="ms-raised-notice"
        @update:model-value="(v) => { if (!v) surface.leftOpen = null; }"
      >
        <template v-if="surface.leftOpen">
          “{{ surface.leftOpen.title }}” is
          {{ surface.leftOpen.status === "converged" ? "ready to resolve" : "still open" }}.
          It is under Threads here when you want it.
        </template>
      </v-snackbar>

      <v-dialog v-model="quoteOpen" max-width="520" scrim="rgba(0,0,0,0.35)">
        <v-card rounded="lg">
          <v-card-title class="px-6 pt-6 pb-1">Quote a passage</v-card-title>
          <v-card-text class="px-6 py-3">
            <p class="text-body-2 text-medium-emphasis mb-3">
              The quote keeps the paragraph as it reads now. Quote it under more than one theme if it fits more than one.
              Start a line with # to name a theme.
            </p>
            <button
              v-for="src in padStore.quoteSources"
              :key="src.id"
              type="button"
              class="quote-src"
              @click="padStore.quoteInto({ sourceIdeaId: src.id }); quoteOpen = false"
            >{{ src.text }}</button>
          </v-card-text>
          <v-card-actions class="px-6 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="quoteOpen = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="surface.acknowledgeOpen" max-width="520" scrim="rgba(0,0,0,0.35)">
        <v-card rounded="lg">
          <v-card-title class="px-6 pt-6 pb-1">Converge over open threads?</v-card-title>
          <v-card-text class="px-6 py-3">
            <p class="text-body-2 text-medium-emphasis mb-3">
              The thesis will replace the draft. These are still open in it. You don't have to settle them:
              their work is kept and moves under the thesis, where you can still finish them.
            </p>
            <ul class="ack-list">
              <li v-for="item in padStore.synthesisAcknowledge" :key="item.id">
                <span class="ack-list__kind">{{ item.kind === "source" ? "Needs a source" : "Open thread" }}</span>
                {{ item.text }}
              </li>
            </ul>
          </v-card-text>
          <v-card-actions class="px-6 pb-5">
            <v-btn variant="text" @click="surface.acknowledgeOpen = false">Not yet</v-btn>
            <v-spacer />
            <v-btn color="primary" variant="flat" @click="surface.confirmAcknowledge()">Converge anyway</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <SendSheet :text="sendText" from="thinkpad" @close="sendText = ''" />

      <LinkDialogs
        :pending="linkPending"
        :viewing-id="viewingLinkId"
        @close="linkPending = null; viewingLinkId = null"
      />

      <DocumentPickerDialog
        v-model="sessionUi.documentPickerOpen"
        :items="surface.padListItems"
        :active-id="currentPadId"
        @select="handlePickerSelect"
        @new="handlePickerNew"
        @delete="surface.handleDeleteDocument"
      />

      <v-dialog v-model="surface.resolveDialog.open" max-width="520" scrim="rgba(0,0,0,0.35)">
        <v-card rounded="lg">
          <v-card-title class="px-6 pt-6 pb-1">Synthesize your takeaway</v-card-title>
          <v-card-text class="px-6 py-3">
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ surface.resolveMove?.prompt ?? "Given what you now see, what's your call?" }}
            </p>
            <v-textarea
              ref="resolveFieldRef"
              v-model="surface.resolveDialog.value"
              :label="surface.resolveMove?.resolutionPlaceholder ?? 'My call is…'"
              variant="outlined"
              rows="3"
              auto-grow
              hide-details
              @keydown.enter.exact.prevent="surface.confirmResolve()"
            />
          </v-card-text>
          <v-card-actions class="px-6 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="surface.resolveDialog.open = false">Cancel</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!surface.resolveDialog.value.trim()"
              @click="surface.confirmResolve()"
            >
              Resolve up
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <OpenItemsDialog
        v-model="surface.gateOpen"
        :goal="surface.currentGoal"
        :items="surface.openItems"
        :decided="surface.decidedItems"
        :lift-targets="surface.liftTargets"
        :can-resolve="surface.canResolve"
        @dispose="surface.handleDisposeOpenItem"
        @clear="surface.handleClearDisposition"
        @go-to="surface.handleGoToOpenItem"
        @resolve="surface.handleResolve()"
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
  /* Container-relative, not viewport-relative: the page renders full-route
     AND inside a dashboard widget cell, so the host decides the bounds. */
  max-height: 100%;
  overflow: hidden;
}

.thinkpad-canvas {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: stretch;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  padding: clamp(12px, 3vh, 40px) clamp(8px, 3vw, 40px);
  padding-block-end: clamp(96px, 12vh, 128px);
  gap: 16px;
}

/* Phones: the thread bar's own buttons get a comfortable tap height. */
@media (max-width: 600px) {
  .drill-bar__intent,
  .drill-crumb,
  .drill-bar__peek {
    min-height: 40px;
  }
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

.thinkpad-quote--clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  cursor: pointer;
}

.drill-bar {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 12px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.65);
}

.drill-bar--expanded {
  width: 100%;
}

.drill-bar--context-open {
  padding-block-end: 10px;
}

.drill-bar__intent {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 2px 4px;
  margin: -2px -4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.drill-bar__intent:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.drill-bar__intent-chevron {
  flex-shrink: 0;
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.drill-bar__move-symbol {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgb(var(--v-theme-primary));
}

.thinkpad-bar-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 2px 10px;
  border: 1px solid rgba(var(--v-theme-primary), 0.45);
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  cursor: pointer;
}

.quote-src {
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

.quote-src:hover { border-color: rgb(var(--v-theme-primary)); }

.ack-list { margin: 0; padding-left: 1.1rem; font-size: 0.9rem; }
.ack-list li { margin-bottom: 4px; }
.ack-list__kind { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.6; margin-right: 6px; }

@media (max-width: 600px) {
  .thinkpad-bar-action { min-height: 40px; }
}

.drill-bar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
  margin-top: 4px;
}

.drill-bar__tag {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-size: 0.8rem;
  cursor: pointer;
}

.drill-bar__tag--on {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.drill-bar__stance-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: rgb(var(--v-theme-primary));
}

.drill-bar__intent-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
}

.drill-bar__thread {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 4px;
  width: 100%;
  padding: 4px 0 0;
  border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
}

.drill-bar__peek {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
  padding: 2px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.drill-bar__peek:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.drill-crumb {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: min(28ch, 100%);
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font: inherit;
  font-size: 0.78rem;
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

.drill-crumb__open {
  margin-left: 4px;
  color: rgb(var(--v-theme-warning));
  white-space: nowrap;
}

.drill-crumb__sep {
  color: rgba(var(--v-theme-on-surface), 0.3);
}

.drill-bar__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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

/* Blank-pad prompt — replaces the empty document with a single framing question. */
.thinkpad-prompt {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

.thinkpad-prompt__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
  max-width: 600px;
  padding: 24px;
  text-align: center;
}

.thinkpad-prompt__eyebrow {
  margin: 0;
}

.thinkpad-prompt__heading {
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-surface));
}

.thinkpad-prompt__form {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

.thinkpad-prompt__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-family: var(--font-sans);
  font-size: 1.05rem;
  outline: none;
  transition: border-color 0.13s ease, box-shadow 0.13s ease;
}

.thinkpad-prompt__input:focus {
  border-color: rgba(var(--v-theme-primary), 0.6);
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.12);
}

.thinkpad-prompt__input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.thinkpad-prompt__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 12px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  cursor: pointer;
  transition: opacity 0.13s ease;
}

.thinkpad-prompt__submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.thinkpad-prompt__submit:not(:disabled):hover {
  opacity: 0.92;
}

.thinkpad-prompt__skip {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.13s ease, background-color 0.13s ease;
}

.thinkpad-prompt__skip:hover {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
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

.thinkpad-doc-card__icon,
.thinkpad-doc-card__meta {
  display: none;
}

.thinkpad-doc-card__date {
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


/* Phones: the page fills the screen edge to edge under the one thin bar
   (Revision 32). A thread's bar keeps a small inset so it reads as a strip. */
@media (max-width: 600px) {
  .thinkpad-canvas {
    padding: 0;
  }
  /* "Pick up where you left off" is a plain document list, like a docs app:
     icon, title, and when / where on one line. No preview on a phone. At most
     about four rows show; the rest scroll, so the question stays in view. */
  .thinkpad-welcome {
    flex-shrink: 0;
    padding: 8px 8px 0;
    gap: 4px;
  }
  .thinkpad-welcome__heading,
  .thinkpad-welcome__empty {
    padding-inline: 8px;
  }
  .thinkpad-prompt {
    flex: 0 0 0;
  }
  .thinkpad-welcome__empty {
    margin: 16px 0 0;
  }
  .thinkpad-new-fab {
    position: fixed;
    right: 20px;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    z-index: 5;
  }
  .thinkpad-welcome__grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  /* With no big prompt below, the list can use the screen. */
  .thinkpad-welcome {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 96px; /* the last row clears the + button */
  }
  .thinkpad-welcome__grid .thinkpad-doc-card {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    min-height: 56px;
    padding: 0 8px;
    border: none;
    border-radius: 8px;
    background: transparent;
    box-shadow: none;
  }
  .thinkpad-welcome__grid .thinkpad-doc-card__page,
  .thinkpad-welcome__grid .thinkpad-doc-card__date {
    display: none;
  }
  .thinkpad-welcome__grid .thinkpad-doc-card__icon {
    display: inline-flex;
    flex-shrink: 0;
    color: rgb(var(--v-theme-primary));
  }
  .thinkpad-welcome__grid .thinkpad-doc-card__caption {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
  }
  .thinkpad-welcome__grid .thinkpad-doc-card__meta {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
  }
  .thinkpad-page-col {
    gap: 0;
  }
  /* A thread's strip is one line: its title, then Focus and Back as icons, then Resolve. */
  .drill-bar,
  .drill-bar--expanded {
    flex-wrap: nowrap;
    align-items: center;
    width: auto;
    margin: 4px 8px;
    padding: 2px 4px 2px 10px;
  }
  .drill-bar__intent {
    align-items: center;
  }
  .drill-bar__intent-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .drill-bar__actions :deep(.drill-bar__btn--squeeze) {
    min-width: 40px;
    padding: 0 8px;
  }
  .drill-bar__actions :deep(.drill-bar__btn--squeeze .v-btn__content) {
    display: none;
  }
  .drill-bar__actions :deep(.drill-bar__btn--squeeze .v-btn__prepend) {
    margin-inline: 0;
  }
}

/* Notices (teleported, so global): lifted above the Write / Reflect bar on phones. */
@media (max-width: 600px) {
  :global(.ms-raised-notice) {
    margin-bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important; /* above the bar and the page turner */
  }
}
</style>
