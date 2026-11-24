// ---------------------------------------------------------------------------
// Pad store — imperative shell over the pure ThinkPad model.
//
// Owns the pad pool and current selection. Surface navigation, drafting, and
// drill-down all react to the surfaceThreadId pointer. Domain reducers stay pure in
// thinkPadModel; this store mints ids/timestamps and persists via padsDb.
// ---------------------------------------------------------------------------

import { defineStore } from "pinia";
import {
  createPad,
  setTitle as setTitleOnPad,
  tagPadAnnotation as tagPadAnnotationOnPad,
  setStepOutput as setStepOutputOnPad,
  setStepTitleById as setStepTitleByIdOnPad,
  pushSurface as pushSurfaceOnPad,
  popSurface as popSurfaceOnPad,
  jumpToSurfaceIndex as jumpToSurfaceIndexOnPad,
  navigateToThread as navigateToThreadOnPad,
  surfaceThreadPath as surfaceThreadPathOnPad,
  drillIntoSpan as drillIntoSpanOnPad,
  discardThread as discardThreadOnPad,
  setPadText as setPadTextOnPad,
  hideSpan as hideSpanOnPad,
  revealHiddenInPad as revealHiddenInPadOnPad,
  reorderBlock as reorderBlockOnPad,
  promoteSpanToMove as promoteSpanToMoveOnPad,
  padForThread as padForThreadOnPad,
  stampDraft as stampDraftOnPad,
  stageStepOutput as stageStepOutputOnPad,
  advanceToNextDraft as advanceToNextDraftOnPad,
  openItems as openItemsOnPad,
  disposeOpenItem as disposeOpenItemOnPad,
  clearDisposition as clearDispositionOnPad,
  canResolve as canResolveOnPad,
  decidedItems as decidedItemsOnPad,
  threadIsOpen as threadIsOpenCheck,
} from "../domain/padDomain";
import { buildPadSnapshot, normalizePadRecord } from "../domain/padPersistenceMapper";
import { makeId, nowIso } from "./idClock";
import {
  upsertPad as upsertPadInDb,
  deletePad as deletePadInDb,
  clearPads as clearPadsInDb,
  getAllPads as getAllPadsFromDb,
} from "../persistence/padsDb";

function persistPadToDb(pad) {
  if (!pad) return;
  const snapshot = buildPadSnapshot(pad, { now: nowIso() });
  if (!snapshot) return;
  const plain = JSON.parse(JSON.stringify(snapshot));
  upsertPadInDb(plain).catch((error) => {
    console.error("Failed to persist pad.", error);
  });
}

function mergePads(inMemory, fromDb) {
  const byId = new Map(fromDb.map((c) => [c.id, c]));
  for (const pad of inMemory) {
    const loaded = byId.get(pad.id);
    if (!loaded) {
      byId.set(pad.id, pad);
      continue;
    }
    const memTime = +new Date(pad.updatedAt ?? 0);
    const dbTime = +new Date(loaded.updatedAt ?? 0);
    const memHasThreads = (pad.threads ?? []).length > 0;
    const dbHasThreads = (loaded.threads ?? []).length > 0;
    if (memTime > dbTime || (memHasThreads && !dbHasThreads)) {
      byId.set(pad.id, pad);
    }
  }
  return [...byId.values()];
}

export const usePadStore = defineStore("pad", {
  state: () => ({
    pads: [],
    currentPadId: null,
    isLoaded: false,
    viewingDraftN: null,
  }),

  getters: {
    currentPad(state) {
      if (!state.currentPadId) return null;
      return state.pads.find((c) => c.id === state.currentPadId) ?? null;
    },

    currentThinkPad() {
      return this.currentPad?.doc ?? { text: "", annotations: [] };
    },

    surfaceHead() {
      return this.currentPad?.surfaceThreadId ?? null;
    },

    viewThreadId() {
      const head = this.surfaceHead;
      return typeof head === "string" && head ? head : null;
    },

    viewPad() {
      return (
        padForThreadOnPad(this.currentPad, this.surfaceHead)
        ?? { text: "", annotations: [] }
      );
    },

    threadPath() {
      return surfaceThreadPathOnPad(this.currentPad);
    },

    /** Undecided open items of a level (null = root document). Open-item gate. */
    openItemsAt() {
      return (padLocator = null) => openItemsOnPad(this.currentPad, padLocator);
    },

    /** Items of a level that already carry a decision (for undo in the gate). */
    decidedItemsAt() {
      return (padLocator = null) => decidedItemsOnPad(this.currentPad, padLocator);
    },

    /** How many undecided open items a level has — for the breadcrumb counts. */
    openCountAt() {
      return (padLocator = null) => openItemsOnPad(this.currentPad, padLocator).length;
    },

    /** Whether the thread on the surface may resolve up: converged and no open items. */
    canResolveSurface() {
      return canResolveOnPad(this.currentPad, this.surfaceHead);
    },

    isDraftFrozen() {
      return (this.viewPad?.phase ?? "stream") === "cultivate";
    },

    stagedOutputs() {
      return this.viewPad?.staged ?? [];
    },

    draftHistory() {
      return this.viewPad?.draftHistory ?? [];
    },

    isDraftHistoryView() {
      return this.viewingDraftN !== null;
    },

    viewingDraftEntry() {
      if (this.viewingDraftN === null) return null;
      return this.draftHistory[this.viewingDraftN] ?? null;
    },

    padPool(state) {
      return [...state.pads].sort(
        (a, b) => +new Date(b.updatedAt ?? 0) - +new Date(a.updatedAt ?? 0),
      );
    },
  },

  actions: {
    async loadPads() {
      try {
        const records = await getAllPadsFromDb();
        const now = nowIso();
        const normalized = Array.isArray(records)
          ? records.map((r) => normalizePadRecord(r, { now })).filter(Boolean)
          : [];
        const inMemory = this.pads;
        const merged = inMemory.length
          ? mergePads(inMemory, normalized)
          : normalized;
        this.pads = merged;
        if (
          this.currentPadId
          && !this.pads.some((c) => c.id === this.currentPadId)
        ) {
          this.currentPadId = this.pads[0]?.id ?? null;
        }
        this.isLoaded = true;
      } catch (error) {
        console.error("Failed to load pads.", error);
        if (this.pads.length === 0) this.pads = [];
        this.isLoaded = true;
      }
    },

    setActivePad(padId) {
      if (typeof padId !== "string" || !padId) return false;
      if (!this.pads.some((c) => c.id === padId)) return false;
      this.currentPadId = padId;
      this.viewingDraftN = null;
      return true;
    },

    activatePad(padId) {
      if (!this.setActivePad(padId)) return false;
      return this.currentPad != null;
    },

    createNewPad({ title } = {}) {
      const pad = createPad({ title, now: nowIso() }, { makeId });
      this.pads = [pad, ...this.pads];
      this.currentPadId = pad.id;
      return pad;
    },

    newPad({ outcome = "", timeboxMinutes = null } = {}) {
      const trimmed = typeof outcome === "string" ? outcome.trim() : "";
      const now = nowIso();
      let pad = createPad({ title: trimmed, now }, { makeId });
      if (timeboxMinutes != null && [5, 10, 15].includes(Number(timeboxMinutes))) {
        pad = {
          ...pad,
          config: { ...pad.config, timing: { ...pad.config.timing, timeboxMinutes: Number(timeboxMinutes) } },
        };
      }
      this.pads = [pad, ...this.pads];
      this.currentPadId = pad.id;
      persistPadToDb(pad);
      return pad;
    },

    _findReusableBlankPad() {
      return (
        this.padPool.find(
          (pad) =>
            (pad.title || "").trim() === ""
            && (pad.doc?.text ?? "").trim() === ""
            && (pad.threads ?? []).length === 0
            && (pad.doc?.phase ?? "stream") !== "cultivate",
        ) ?? null
      );
    },

    ensureBlankPad() {
      if (this.currentPad) return this.currentPad;
      const reusable = this._findReusableBlankPad();
      if (reusable) {
        this.setActivePad(reusable.id);
        return reusable;
      }
      return this.newPad({});
    },

    newBlankPad() {
      this.persistCurrent();
      const reusable = this._findReusableBlankPad();
      if (reusable) {
        this.setActivePad(reusable.id);
        return reusable;
      }
      return this.newPad({});
    },

    deletePad(padId) {
      if (!padId) return;
      this.pads = this.pads.filter((c) => c.id !== padId);
      if (this.currentPadId === padId) {
        this.currentPadId = this.pads[0]?.id ?? null;
      }
      deletePadInDb(padId).catch((error) => {
        console.error("Failed to delete pad.", error);
      });
    },

    clearAll() {
      this.pads = [];
      this.currentPadId = null;
      clearPadsInDb().catch((error) => {
        console.error("Failed to clear pads.", error);
      });
    },

    _replaceCurrent(nextPad) {
      if (!nextPad || !this.currentPadId) return;
      this.pads = this.pads.map((c) =>
        c.id === this.currentPadId ? nextPad : c,
      );
      persistPadToDb(nextPad);
    },

    stampDraft({ padLocator = null } = {}) {
      if (!this.currentPad) return;
      const now = nowIso();
      const stamped = stampDraftOnPad(this.currentPad, { padLocator }, { now });
      if (stamped === this.currentPad) return;
      this._replaceCurrent(stamped);
    },

    advanceToNextDraft({ padLocator = null } = {}) {
      if (!this.currentPad) return;
      const doc = padForThreadOnPad(this.currentPad, padLocator);
      if (!doc || doc.phase !== "cultivate" || !(doc.staged?.length)) return;
      const now = nowIso();
      const next = advanceToNextDraftOnPad(this.currentPad, { padLocator }, { now, makeId });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
      this.viewingDraftN = null;
    },

    navigateToDraft(n) {
      if (typeof n === "number" && n >= 0 && n < this.draftHistory.length) {
        this.viewingDraftN = n;
      }
    },

    exitDraftHistory() {
      this.viewingDraftN = null;
    },

    drillIntoSpan({ parentThreadId = null, title, selectionStart, selectionEnd, selectedText = "", move = "", writeBack = "replace", tag = null } = {}) {
      if (!this.currentPad) return null;
      const now = nowIso();
      const { pad, frame } = drillIntoSpanOnPad(this.currentPad, {
        parentThreadId, title, selectionStart, selectionEnd, selectedText, move, writeBack, tag,
      }, { now, makeId });
      if (!frame) return null;
      const descended = pushSurfaceOnPad(pad, frame.id, { now });
      this._replaceCurrent(descended);
      return frame;
    },

    navigateToThread(threadId = null) {
      if (!this.currentPad) return;
      const next = navigateToThreadOnPad(this.currentPad, threadId, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    pushSurface(threadId = null) {
      if (!this.currentPad || !threadId) return;
      const next = pushSurfaceOnPad(this.currentPad, threadId, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    jumpToSurfaceIndex(index = 0) {
      if (!this.currentPad) return;
      const next = jumpToSurfaceIndexOnPad(this.currentPad, index, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    setThreadGoal(title) {
      if (!this.currentPad) return;
      const path = surfaceThreadPathOnPad(this.currentPad);
      const stepId = path.length ? path[path.length - 1].steps?.[0]?.id : null;
      if (!stepId) return;
      const next = setStepTitleByIdOnPad(this.currentPad, { stepId, title }, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    ascendThread() {
      if (!this.currentPad) return;
      const viewId = this.surfaceHead;
      if (typeof viewId !== "string" || !viewId) return;
      const now = nowIso();
      // Parent of the current surface, resolved BEFORE pruning — discarding viewId
      // removes it from the tree, so popSurface could no longer derive its parent.
      const path = surfaceThreadPathOnPad(this.currentPad);
      const parentId = path.length >= 2 ? path[path.length - 2].id : null;
      const pruned = discardThreadOnPad(this.currentPad, viewId, { now });
      const next = navigateToThreadOnPad(pruned, parentId, { now });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    resolveThreadIntoParent({ threadId, result: explicitResult } = {}) {
      if (!this.currentPad) return null;
      const now = nowIso();
      const path = this.threadPath;
      const frame = path.length > 0 && path[path.length - 1].id === threadId
        ? path[path.length - 1] : null;
      if (!frame) return null;
      // The open-item gate: every open item at this level must be decided first.
      // Convergence is checked below; a typed synthesis can stand in for it.
      if (openItemsOnPad(this.currentPad, threadId).length) return null;

      const anchor = frame.parentAnchor;
      if (!anchor) return null;
      const childStep = frame.steps?.[0];
      if (!childStep) return null;

      const subPadText = (padForThreadOnPad(this.currentPad, threadId)?.text ?? "").trim();
      const synthesized = typeof explicitResult === "string" ? explicitResult.trim() : "";
      if (threadIsOpenCheck(frame) && !synthesized) return null;
      const rollUpText = synthesized || subPadText;
      if (!rollUpText) return null;

      const parentFrameId = anchor.parentFrameId ?? null;
      const annotationId = anchor.annotationId;

      const parentDoc = padForThreadOnPad(this.currentPad, parentFrameId);
      const anchorRec = (parentDoc?.annotations ?? []).find((a) => a.id === annotationId);
      if (anchorRec?.resolved === true) {
        const ascended = popSurfaceOnPad(this.currentPad, { now });
        this._replaceCurrent(ascended);
        return { resolved: true, delta: null };
      }

      let pad = setStepOutputOnPad(this.currentPad, { stepId: childStep.id, output: rollUpText }, { now });
      pad = stampDraftOnPad(pad, { padLocator: parentFrameId }, { now });
      pad = stageStepOutputOnPad(pad, {
        stepId: childStep.id, annotationId, text: rollUpText, padLocator: parentFrameId,
      }, { now, makeId });

      const ascended = popSurfaceOnPad(pad, { now });
      this._replaceCurrent(ascended);
      return { resolved: true, delta: null };
    },

    /** Decide an open item: accepted / lifted (to `target`) / parked. */
    disposeOpenItem({ padLocator = null, id, kind, note = "", target = null } = {}) {
      if (!this.currentPad) return;
      const next = disposeOpenItemOnPad(this.currentPad, { padLocator, id, kind, note, target }, { now: nowIso(), makeId });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    /** Undo a decision so the item is open again. */
    clearDisposition({ padLocator = null, id } = {}) {
      if (!this.currentPad) return;
      const next = clearDispositionOnPad(this.currentPad, { padLocator, id }, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    setPadText({ padLocator = null, text, nodes = null } = {}) {
      if (!this.currentPad) return;
      const next = setPadTextOnPad(
        this.currentPad,
        { padLocator, text, nodes },
        { now: nowIso(), makeId },
      );
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    tagAnnotation({ annotationId, tag, padLocator = null } = {}) {
      if (!this.currentPad || !annotationId) return;
      const next = tagPadAnnotationOnPad(this.currentPad, { padLocator, annotationId, tag }, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    hideSpanInPad({ padLocator = null, selectionStart, selectionEnd, selectedText = "" } = {}) {
      if (!this.currentPad) return;
      const next = hideSpanOnPad(
        this.currentPad,
        { padLocator, selectionStart, selectionEnd, selectedText },
        { now: nowIso(), makeId },
      );
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    reorderBlock({ padLocator = null, fromIdx, toIdx } = {}) {
      if (!this.currentPad) return;
      const next = reorderBlockOnPad(
        this.currentPad,
        { padLocator, fromIdx, toIdx },
        { now: nowIso(), makeId },
      );
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    revealHiddenInPad({ padLocator = null } = {}) {
      if (!this.currentPad) return;
      const next = revealHiddenInPadOnPad(this.currentPad, { padLocator }, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    promoteWithinPad({ padLocator = null, title, selectionStart, selectionEnd, selectedText = "", move = "", writeBack = "replace" } = {}) {
      if (!this.currentPad) return null;
      const now = nowIso();
      const { pad, step } = promoteSpanToMoveOnPad(this.currentPad, {
        title, selectionStart, selectionEnd, selectedText, move, writeBack, padLocator,
      }, { now, makeId });
      if (!step) return null;
      this._replaceCurrent(pad);
      return step;
    },

    setCurrentPadTitle(title) {
      if (!this.currentPad) return;
      const next = setTitleOnPad(this.currentPad, title, { now: nowIso() });
      if (next === this.currentPad) return;
      this._replaceCurrent(next);
    },

    persistCurrent() {
      persistPadToDb(this.currentPad);
    },
  },
});
