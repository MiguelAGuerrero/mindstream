// ---------------------------------------------------------------------------
// Focus-run store — the live runtime for the authored focus runner.
//
// Holds many isolated CONTEXTS (see models/session.js). Each context owns a
// stack of authored focuses: the root problem + decompositions. One context is
// active (shown as the sticky note); the rest sit in the rail. You switch by
// clicking; you STOP one (with an optional reason) when it's blocked /
// awaiting something external, then work another.
//
// All the focus moves (drill/complete/abandon) operate on the ACTIVE context's
// stack. Separate from padStore / the thinkPad domain. Workflows are deferred
// (no template is consulted). Contexts persist to IndexedDB (focusDb) so
// threads survive reload — "faithful resume" is the point of the rail. The
// timer stays in-memory (restarts on load, same as switching today).
// ---------------------------------------------------------------------------

import { acceptHMRUpdate, defineStore } from "pinia";
import {
  cleanSteps,
  createFocusFrame,
  createContext,
  nextUndoneStep,
  normalizeContextRecord,
} from "../model/session.js";
import { isDecision, stepOptions } from "../../handoff/steps.js";
import {
  getAllContexts as getAllContextsFromDb,
  upsertContext as upsertContextInDb,
  deleteContext as deleteContextInDb,
} from "../persistence/focusDb.js";

// Fire-and-forget write-through, wired once per app lifetime (module scope so
// remounts don't stack subscriptions). Tracks persisted ids to issue deletes
// for removed contexts, since $subscribe only sees the surviving state.
let persistenceWired = false;
let persistedIds = new Set();

/** Project a context's frames into deck cards, root → active: index 0 renders
 *  at the TOP and the last card is the active subproblem at the BOTTOM.
 *
 *  Shared by `contextBoard` (a column on the board) and `activeStackCards` (the
 *  trail panel beside the card) so both surfaces are literally the same
 *  projection — one place owns the card contract.
 *
 *  Keep PURE and UNMEMOIZED: `stack` is mutated in place by push/pop, so its
 *  array identity never changes and any cache keyed on it would go permanently
 *  stale. (Pinia getters track whatever reactive property is READ during
 *  evaluation, so reading them from a plain helper tracks fine.) */
function toCards(stack) {
  return stack.map((f, i) => ({
    id: f.id,
    title: f.title,
    // Carried on EVERY card: a parent holding a folded-up takeaway earns a
    // mark in its strip, not just the active frame.
    result: f.result ?? null,
    depthIndex: i,
    // The one flag the deck needs — peeking is exactly `!isActive`, so depth-1
    // (where the root IS the active frame) needs no special case.
    isActive: i === stack.length - 1,
  }));
}

function syncContextsToDb(contexts) {
  const currentIds = new Set(contexts.map((c) => c.id));
  for (const id of persistedIds) {
    if (!currentIds.has(id)) {
      deleteContextInDb(id).catch((error) => console.error("Failed to delete focus context.", error));
    }
  }
  persistedIds = currentIds;
  for (const context of contexts) {
    upsertContextInDb(context).catch((error) => console.error("Failed to persist focus context.", error));
  }
}

export const useSessionRunStore = defineStore("sessionRun", {
  state: () => ({
    contexts: [],
    activeContextId: null,
    nextId: 1,
    isLoaded: false,
  }),

  getters: {
    hasContexts: (s) => s.contexts.length > 0,
    activeContext(s) {
      return s.contexts.find((c) => c.id === s.activeContextId) ?? null;
    },
    /** True when there's an active context to show as the card. */
    hasFocus() {
      return this.activeContext != null;
    },
    activeStack() {
      return this.activeContext?.stack ?? [];
    },
    depth() {
      return this.activeStack.length;
    },
    activeFrame() {
      const st = this.activeStack;
      return st.length ? st[st.length - 1] : null;
    },
    currentFocus() {
      return this.activeFrame?.title ?? "";
    },
    currentResult() {
      return this.activeFrame?.result ?? null;
    },
    /** Decompose trail (root → active) of the active context, for the breadcrumb. */
    breadcrumb() {
      return this.activeStack.map((f) => f.title);
    },
    currentResolved() {
      return this.activeContext?.resolved ?? false;
    },
    /** Rail items: one per context, with switch/park display info. */
    contextList(s) {
      return s.contexts.map((c) => ({
        id: c.id,
        problem: c.stack[0]?.title ?? "",
        current: c.stack.length ? c.stack[c.stack.length - 1].title : "",
        result: c.stack[0]?.result ?? null,
        depth: c.stack.length,
        parked: c.parked,
        waitingOn: c.waitingOn,
        resolved: c.resolved,
        isActive: c.id === s.activeContextId,
      }));
    },

    /** Board columns: one per context, carrying the WHOLE frame deck (contextList
     *  deliberately flattens to problem+current; the board draws every level).
     *  Cards run root → active, so index 0 renders at the TOP of the column and
     *  the last card is the active subproblem at the BOTTOM — the stack you pop.
     *
     *  Ordered live → parked → resolved so pickup-able work stays on the left.
     *  Array#sort is stable, so within a band contexts keep creation order.
     *  `.map()` builds a FRESH array, so `.sort()` never reorders store state —
     *  keep that order if you refactor.
     *
     *  The sort lives here rather than in the board component because it's pure
     *  and the test env (node, no DOM) can only reach it here.
     *
     *  `state` collapses contextList's parked/resolved booleans into the one
     *  field that drives the sort key, the modifier class and the status icon. */
    contextBoard(s) {
      const RANK = { live: 0, parked: 1, resolved: 2 };
      return s.contexts
        .map((c) => ({
          id: c.id,
          // Terminal wins if both flags are set — same precedence as the rail.
          state: c.resolved ? "resolved" : c.parked ? "parked" : "live",
          depth: c.stack.length,
          waitingOn: c.waitingOn,
          isActive: c.id === s.activeContextId,
          cards: toCards(c.stack),
        }))
        .sort((a, b) => RANK[a.state] - RANK[b.state]);
    },

    /** The ordered plan the active card is part of, or null. Either the active
     *  frame HOLDS a plan (`running: false`, between steps), or it IS the current
     *  step of its parent's plan (`running: true`). Method shorthand: needs `this`. */
    activePlan() {
      const st = this.activeStack;
      const frame = st[st.length - 1];
      if (!frame) return null;
      const view = (f, running) => {
        const done = f.steps.map((_, i) => f.stepDone?.[i] === true);
        return {
          // The frame that holds the plan: its title names the plan, its id refers to it.
          title: f.title,
          frameId: f.id,
          steps: f.steps,
          index: f.stepIndex ?? 0,
          running,
          done,
          allDone: done.every(Boolean),
          results: Array.isArray(f.stepResults) ? f.stepResults : [],
          choices: Array.isArray(f.stepChoices) ? f.stepChoices : [],
          // The call the current step asks for, when it is running and is one.
          decision: running && isDecision(f.steps[f.stepIndex]) ? { options: stepOptions(f.steps[f.stepIndex]) } : null,
          // Opaque tag the steps arrived with (e.g. which workflow, which version).
          tag: f.planTag ?? null,
        };
      };
      if (frame.steps?.length) return view(frame, false);
      const parent = st[st.length - 2];
      if (parent?.steps?.length && frame.fromStep != null && frame.fromStep === parent.stepIndex) {
        return view(parent, true);
      }
      return null;
    },

    /** The ACTIVE context's stack as trail strips, root → current — what the
     *  panel beside the prompt card draws. Empty whenever nothing is active
     *  (board showing, context parked, or root completed), which is exactly
     *  when the panel isn't rendered. Method shorthand, not an arrow: `this`
     *  has to resolve to the store. */
    activeStackCards() {
      return toCards(this.activeStack);
    },
  },

  actions: {
    /** Hydrate from IndexedDB once, then write-through on every change.
     *  nextId is derived from the loaded records (never persisted) so it can't
     *  go stale. Safe to call from multiple mounts. */
    async loadContexts() {
      if (this.isLoaded) return;
      try {
        const records = await getAllContextsFromDb();
        const contexts = records.map((r) => normalizeContextRecord(r)).filter(Boolean);
        const ids = contexts.flatMap((c) => [c.id, ...c.stack.map((f) => f.id)]).filter(Number.isFinite);
        this.contexts = contexts;
        this.nextId = ids.length ? Math.max(...ids) + 1 : 1;
        persistedIds = new Set(contexts.map((c) => c.id));
      } catch (error) {
        console.error("Failed to load focus contexts.", error);
      }
      this.isLoaded = true;
      if (!persistenceWired) {
        persistenceWired = true;
        this.$subscribe((_mutation, state) => syncContextsToDb(state.contexts), { detached: true });
      }
    },

    _frame(title) {
      return createFocusFrame({
        id: this.nextId++,
        title: (title ?? "").trim(),
        createdAt: new Date().toISOString(),
      });
    },

    /** The frame for step `index` of the parent's plan. */
    _stepFrame(parent, index) {
      return createFocusFrame({
        id: this.nextId++,
        title: parent.steps[index].prompt,
        createdAt: new Date().toISOString(),
        fromStep: index,
      });
    },

    /** Author a new problem — its own context — and make it active. */
    newContext({ title, notes, origin, handoffId } = {}) {
      const t = (title ?? "").trim();
      if (!t) return;
      const ctx = createContext({
        id: this.nextId++,
        rootFrame: this._frame(t),
        createdAt: new Date().toISOString(),
        notes,
        origin,
        handoffId,
      });
      this.contexts.push(ctx);
      this.activeContextId = ctx.id;
    },

    /** Bank elapsed seconds into a context (the timer is in-memory and resets). */
    addSpentSeconds({ id, seconds } = {}) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx || typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return;
      ctx.spentSeconds = (ctx.spentSeconds || 0) + seconds;
    },
    /** Record (or clear, with null) the handoff a context is waiting on. */
    setAwaitingHandoff({ id, handoffId = null } = {}) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx) return;
      ctx.awaitingHandoffId = typeof handoffId === "string" && handoffId ? handoffId : null;
    },
    /** Switch to a context by clicking it — resuming clears its parked state.
     *  waitingOn is deliberately KEPT: it's the re-entry cue ("was waiting
     *  on…"), most useful at the exact moment of resuming. The card shows it
     *  as a dismissible chip; clearWaitingOn drops it. */
    switchContext(id) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx) return;
      ctx.parked = false;
      this.activeContextId = id;
    },

    /** Dismiss the re-entry cue on a context (any state). */
    clearWaitingOn({ id } = {}) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx) return;
      ctx.waitingOn = "";
    },

    /** Step off the active context without parking/ending it (e.g. to author a new one). */
    deactivate() {
      this.activeContextId = null;
    },

    /** Decompose the active focus — push an authored sub-focus. The move. */
    drillIntoFocus({ title } = {}) {
      const ctx = this.activeContext;
      if (!ctx) return;
      const t = (title ?? "").trim();
      if (!t) return;
      ctx.stack.push(this._frame(t));
    },

    /** Fold an optional takeaway into the active focus. At root, marks the
     *  context resolved and steps off it; when drilled, pops without rolling up. */
    completeFocus({ result = "" } = {}) {
      const ctx = this.activeContext;
      if (!ctx || ctx.stack.length < 1) return;
      const r = typeof result === "string" ? result.trim() : "";
      if (ctx.stack.length >= 2) {
        const finished = ctx.stack.pop();
        const parent = ctx.stack[ctx.stack.length - 1];
        // Finishing the current step of a plan moves on to the next one.
        if (parent?.steps && finished?.fromStep != null && finished.fromStep === parent.stepIndex) {
          // Keep the step's reflection on the plan; the step frame itself is gone.
          const note = r || finished.result || "";
          if (note) {
            const results = Array.isArray(parent.stepResults) ? [...parent.stepResults] : [];
            results[finished.fromStep] = note;
            parent.stepResults = results;
          }
          const done = parent.steps.map((_, i) => parent.stepDone?.[i] === true);
          done[finished.fromStep] = true;
          parent.stepDone = done;
          parent.stepIndex = nextUndoneStep(done, finished.fromStep);
          if (parent.stepIndex < parent.steps.length) ctx.stack.push(this._stepFrame(parent, parent.stepIndex));
        }
        return;
      }
      // Root: record takeaway, mark resolved, step off. We deliberately do NOT
      // auto-pick another context: the surface is derived from activeContextId,
      // so hopping would drop you inside a problem you didn't choose, with a
      // fresh clock. Null lands you back on the board (or the rail's picker).
      if (r) ctx.stack[0].result = r;
      ctx.resolved = true;
      this.activeContextId = null;
    },

    /** Finish the running decision step by choosing its output. The choice is
     *  kept on the plan (separate from any reflection) and the plan moves on.
     *  No-op unless the active frame is the current step of a plan and that
     *  step is a decision. With fixed options, the choice must be one of them. */
    decideStep({ choice } = {}) {
      const ctx = this.activeContext;
      const st = ctx?.stack ?? [];
      const step = st[st.length - 1];
      const holder = st[st.length - 2];
      if (!step || !holder?.steps || step.fromStep == null || step.fromStep !== holder.stepIndex) return;
      const planned = holder.steps[step.fromStep];
      const value = typeof choice === "string" ? choice.replace(/\s+/g, " ").trim() : "";
      if (!isDecision(planned) || !value) return;
      const options = stepOptions(planned);
      if (options.length && !options.includes(value)) return;
      const choices = holder.steps.map((_, i) => holder.stepChoices?.[i] ?? "");
      choices[step.fromStep] = value;
      holder.stepChoices = choices;
      this.completeFocus({ result: step.result ?? "" });
    },

    /** Record (or clear, with "") a reflection on the active focus without completing it. */
    reflectOnFocus({ text = "" } = {}) {
      const frame = this.activeFrame;
      if (!frame) return;
      const t = typeof text === "string" ? text.trim() : "";
      frame.result = t || null;
    },

    /** Decompose the active focus into an ordered plan and start on step 1. The
     *  plan lives on the frame, so no step is lost while you work on another. */
    planSteps({ steps, tag = null } = {}) {
      const ctx = this.activeContext;
      const frame = this.activeFrame;
      const plan = cleanSteps(steps);
      if (!ctx || !frame || !plan.length) return;
      frame.steps = plan;
      frame.stepIndex = 0;
      frame.stepDone = plan.map(() => false);
      delete frame.stepResults;
      delete frame.stepChoices;
      // Opaque: Focus keeps it and never reads it (roadmap §4.2 `tag`).
      if (typeof tag === "string" && tag) frame.planTag = tag;
      else delete frame.planTag;
      ctx.stack.push(this._stepFrame(frame, 0));
    },

    /** Start (or restart) step `index` of the active frame's plan. */
    startStep({ index } = {}) {
      const ctx = this.activeContext;
      const frame = this.activeFrame;
      if (!ctx || !frame?.steps || !Number.isInteger(index) || index < 0 || index >= frame.steps.length) return;
      frame.stepIndex = index;
      ctx.stack.push(this._stepFrame(frame, index));
    },

    /** Pivot to step `index` of the plan you're in, from the plan or from inside
     *  one of its steps. Leaving a step this way does not mark it done; any note
     *  on it is kept on the plan. A sub-focus you drilled into below the step is
     *  closed with it. */
    jumpToStep({ index } = {}) {
      const ctx = this.activeContext;
      if (!ctx) return;
      // The frame holding the plan: the active one, or the nearest ancestor with steps.
      let at = ctx.stack.length - 1;
      while (at >= 0 && !ctx.stack[at].steps?.length) at--;
      if (at < 0) return;
      const holder = ctx.stack[at];
      if (!Number.isInteger(index) || index < 0 || index >= holder.steps.length) return;
      const leaving = ctx.stack[at + 1];
      if (leaving?.fromStep === index) return; // already on it
      if (leaving?.fromStep != null && leaving.result) {
        const results = Array.isArray(holder.stepResults) ? [...holder.stepResults] : [];
        results[leaving.fromStep] = leaving.result;
        holder.stepResults = results;
      }
      ctx.stack.splice(at + 1);
      holder.stepIndex = index;
      ctx.stack.push(this._stepFrame(holder, index));
    },

    /** Pop the active decomposition WITHOUT writing anything up. No-op at the root. */
    abandonFocus() {
      const ctx = this.activeContext;
      if (!ctx || ctx.stack.length < 2) return;
      ctx.stack.pop();
    },

    /** Stop the active context (blocked / awaiting external) with an optional reason, set it aside. */
    parkActiveContext({ reason = "" } = {}) {
      const ctx = this.activeContext;
      if (!ctx) return;
      ctx.parked = true;
      ctx.waitingOn = typeof reason === "string" ? reason.trim() : "";
      this.activeContextId = null;
    },

    /** Update the optional reason on a stopped context (rail edit). */
    setWaitingOn({ id, reason = "" } = {}) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx?.parked) return;
      ctx.waitingOn = typeof reason === "string" ? reason.trim() : "";
    },

    /** Close the active context (the problem is done) and remove it. Steps off
     *  rather than promoting a survivor: promoting picked an arbitrary context
     *  AND un-parked it, mutating state nobody asked to change. "Close" means
     *  take me back — you pick what's next. */
    endActiveContext() {
      const ctx = this.activeContext;
      if (!ctx) return;
      this.contexts = this.contexts.filter((c) => c.id !== ctx.id);
      this.activeContextId = null;
    },
  },
});

// Without this, editing this file hot-swaps the MODULE but leaves the live
// store instance on its old getters/actions — so a newly added getter reads
// `undefined` in components that already mounted, and you get a half-updated
// UI that a hard reload silently "fixes". Costs nothing in production:
// import.meta.hot is undefined outside the dev server (and in vitest).
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSessionRunStore, import.meta.hot));
}
