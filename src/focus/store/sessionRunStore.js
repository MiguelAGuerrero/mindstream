// ---------------------------------------------------------------------------
// Focus-run store — the live runtime for the authored focus runner.
//
// Holds many isolated CONTEXTS (see models/session.js). Each context owns a
// stack of authored focuses: the root problem + decompositions. One context is
// active (shown as the sticky note); the rest sit in the rail. You switch by
// clicking; you PARK one (with an optional "waiting on…" reason) when it's
// blocked / awaiting something external, then work another.
//
// All the focus moves (drill/resolve/abandon) operate on the ACTIVE context's
// stack. Separate from padStore / the thinkPad domain. Workflows are deferred
// (no template is consulted). No persistence: in-memory, lost on reload.
// ---------------------------------------------------------------------------

import { defineStore } from "pinia";
import { createFocusFrame, createContext } from "../model/session.js";

export const useSessionRunStore = defineStore("sessionRun", {
  state: () => ({
    contexts: [],
    activeContextId: null,
    nextId: 1,
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
  },

  actions: {
    _frame(title) {
      return createFocusFrame({
        id: this.nextId++,
        title: (title ?? "").trim(),
        createdAt: new Date().toISOString(),
      });
    },

    /** Author a new problem — its own context — and make it active. */
    newContext({ title } = {}) {
      const t = (title ?? "").trim();
      if (!t) return;
      const ctx = createContext({
        id: this.nextId++,
        rootFrame: this._frame(t),
        createdAt: new Date().toISOString(),
      });
      this.contexts.push(ctx);
      this.activeContextId = ctx.id;
    },

    /** Switch to a context by clicking it — resuming clears its parked state. */
    switchContext(id) {
      const ctx = this.contexts.find((c) => c.id === id);
      if (!ctx) return;
      ctx.parked = false;
      ctx.waitingOn = "";
      this.activeContextId = id;
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
     *  context resolved and steps off it; when drilled, pops and records on parent. */
    resolveFocus({ result = "" } = {}) {
      const ctx = this.activeContext;
      if (!ctx || ctx.stack.length < 1) return;
      const r = typeof result === "string" ? result.trim() : "";
      if (ctx.stack.length >= 2) {
        ctx.stack.pop();
        if (r) {
          const parent = ctx.stack[ctx.stack.length - 1];
          if (parent) parent.result = r;
        }
        return;
      }
      // Root: record takeaway, mark resolved, step off to the next live context.
      if (r) ctx.stack[0].result = r;
      ctx.resolved = true;
      const next = this.contexts.find((c) => c.id !== ctx.id && !c.parked && !c.resolved);
      this.activeContextId = next ? next.id : null;
    },

    /** Pop the active decomposition WITHOUT writing anything up. No-op at the root. */
    abandonFocus() {
      const ctx = this.activeContext;
      if (!ctx || ctx.stack.length < 2) return;
      ctx.stack.pop();
    },

    /** Park the active context (blocked / awaiting external) with an optional reason, set it aside. */
    parkActiveContext({ reason = "" } = {}) {
      const ctx = this.activeContext;
      if (!ctx) return;
      ctx.parked = true;
      ctx.waitingOn = typeof reason === "string" ? reason.trim() : "";
      this.activeContextId = null;
    },

    /** Close the active context (the problem is done) and remove it. */
    endActiveContext() {
      const ctx = this.activeContext;
      if (!ctx) return;
      const id = ctx.id;
      const remaining = this.contexts.filter((c) => c.id !== id);
      this.contexts = remaining;
      if (remaining.length === 0) {
        this.activeContextId = null;
        return;
      }
      const next = remaining[remaining.length - 1];
      this.activeContextId = next.id;
      next.parked = false;
      next.waitingOn = "";
    },
  },
});
