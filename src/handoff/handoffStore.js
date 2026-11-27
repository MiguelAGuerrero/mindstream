// ---------------------------------------------------------------------------
// Handoff store — the shell's one channel between tools (roadmap §4.2, §4.3).
// A sender `create`s a request and navigates to the receiver's route with only
// its id. The receiver `peek`s it (to show a ready screen), then `accept`s it
// (naming the work it made), `answer`s it at once, or `decline`s it, and
// `reply`s when accepted work ends. The sender reads its own reply with
// `replyFor`, or `summaryFor` across several. Tools never read each other's state.
//
// Persisted as a small localStorage blob (see handoffStorage.js) so a consumed
// request stays consumed across reload, and a pending one survives it.
// ---------------------------------------------------------------------------
import { acceptHMRUpdate, defineStore } from "pinia";
import { HANDOFF_QUERY_PARAM, getTool, routeForTool, serves } from "./toolRegistry.js";
import { createRequest, normalizeHandoffRecord, normalizeReply, summarizeReplies } from "./handoffModel.js";
import { readHandoffs, writeHandoffs } from "./handoffStorage.js";
import { useShelfStore } from "../shelf/shelfStore.js";

const MAX_HANDOFFS = 500;

// Subscriptions are wired once per store instance (a WeakSet, so tests that
// create fresh pinias each get their own write-through).
const wired = new WeakSet();
let seq = 0;

function copy(handoff) {
  return JSON.parse(JSON.stringify(handoff));
}

export const useHandoffStore = defineStore("handoff", {
  state: () => ({
    handoffs: [],
    hydrated: false,
  }),
  getters: {
    /** Requests still waiting on a reply (Phase 4 open loops), newest first. */
    waiting(state) {
      return state.handoffs.filter((h) => h.replyTo && !h.reply).slice().reverse();
    },
    /** The waiting requests as workspace rows (Phase 4), each with its ending. */
    openLoops() {
      return this.waiting.map((h) => ({
        tool: h.to.tool,
        id: h.id,
        title: h.text,
        next: `Waiting on ${getTool(h.to.tool)?.name ?? "another tool"}`,
        where: getTool(h.replyTo.tool)?.name ?? "",
        place: { handoff: h.id },
        end: { label: "Stop waiting", action: "stopWaiting", args: { id: h.id } },
      }));
    },
  },
  actions: {
    /** Stop waiting on a request, on behalf of whichever tool sent it. */
    stopWaiting({ id } = {}) {
      const h = this.handoffs.find((x) => x.id === id);
      return h?.replyTo ? this.cancel(id, h.replyTo.tool) : false;
    },
    /** Load persisted requests once and write through on every change. Idempotent. */
    hydrate() {
      if (!this.hydrated) {
        const records = readHandoffs() ?? [];
        this.handoffs = records.map((r) => normalizeHandoffRecord(r)).filter(Boolean);
        this.hydrated = true;
      }
      if (!wired.has(this)) {
        wired.add(this);
        this.$subscribe((_mutation, state) => writeHandoffs(state.handoffs), { detached: true, flush: "sync" });
      }
    },
    /** Mint and store a request. Returns a copy, or null when it can't be delivered. */
    create(message = {}) {
      this.hydrate();
      const now = new Date();
      const id = `ho:${now.getTime().toString(36)}:${(seq++).toString(36)}`;
      const request = createRequest(message, { id, now: now.toISOString() });
      if (!request) return null;
      this.handoffs.push(request);
      if (this.handoffs.length > MAX_HANDOFFS) this.handoffs.splice(0, this.handoffs.length - MAX_HANDOFFS);
      return copy(request);
    },
    _deliverable(id, toTool) {
      if (typeof id !== "string" || !id) return null;
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.consumedAt) return null;
      if (h.to.tool !== toTool || !serves(toTool, h.want, h.steps ?? [])) return null;
      return h;
    },
    /** Read a pending request without consuming it. Null if missing, consumed, or not for `toTool`. */
    peek(id, toTool) {
      this.hydrate();
      const h = this._deliverable(id, toTool);
      return h ? copy(h) : null;
    },
    // Taking a request is only possible together with saying what becomes of
    // it. There is deliberately no bare "take": that is how a request ends up
    // taken and never answered (Revision 40). A receiver has three choices:
    //   accept(id, tool, ref)   work on it; `ref` names the work made for it
    //   answer(id, tool, reply) take it and answer in one step
    //   decline(id, tool)       turn it down
    _take(id, toTool) {
      const h = this._deliverable(id, toTool);
      if (!h) return null;
      h.consumedAt = new Date().toISOString();
      return h;
    },
    /**
     * Take a pending request to work on. `ref` names the receiver's own work
     * for it (a pad id, a context id) and is required when a reply is expected,
     * so the request can be answered as abandoned if that work goes away
     * (settleAccepted). Null if missing, already taken, not for `toTool`, or
     * no ref was given. A second call returns null.
     */
    accept(id, toTool, ref) {
      this.hydrate();
      const clean = typeof ref === "string" ? ref.trim() : "";
      const pending = this._deliverable(id, toTool);
      if (!pending || (!pending.oneWay && !clean)) return null;
      const h = this._take(id, toTool);
      if (clean) h.to.ref = clean;
      return copy(h);
    },
    /** Take a pending request and answer it in one step. Returns the request, or null. */
    answer(id, toTool, message) {
      this.hydrate();
      const pending = this._deliverable(id, toTool);
      if (!pending) return null;
      if (!pending.oneWay) {
        const clean = normalizeReply(message, pending);
        if (!clean) return null;
        pending.reply = clean;
      }
      pending.consumedAt = new Date().toISOString();
      return copy(pending);
    },
    /**
     * The receiver turns a pending request down ("Not now"): it is taken so it
     * cannot come back, and answered as abandoned so the sender stops waiting.
     * A request is never left silently unanswered (tool contract, point 4).
     */
    decline(id, toTool) {
      this.hydrate();
      const h = this._deliverable(id, toTool);
      if (!h) return false;
      h.consumedAt = new Date().toISOString();
      if (h.oneWay) {
        // A one-way Send has no asker to tell: its text goes to the shelf
        // (roadmap §4.3) instead of being lost. A set of steps is not text in
        // transit (it still lives where it came from), so it is just dropped.
        if (!h.steps?.length) useShelfStore().add({ text: h.text, from: null });
      } else if (!h.reply) {
        h.reply = normalizeReply({ outcome: "abandoned" }, h);
      }
      return true;
    },
    /**
     * The requests `toTool` accepted and has not answered yet. A receiver uses
     * this to notice work of its own that is gone (a deleted pad, a closed
     * context) and answer those requests as abandoned.
     */
    acceptedBy(toTool) {
      this.hydrate();
      return this.handoffs.filter((h) => h.to.tool === toTool && h.consumedAt && h.replyTo && !h.reply).map(copy);
    },
    /** The requests `tool` sent that have no reply yet. A sender uses this to stop waiting for work whose asker is gone. */
    waitingFrom(tool) {
      this.hydrate();
      return this.handoffs.filter((h) => h.replyTo?.tool === tool && !h.reply).map(copy);
    },
    /**
     * Answer as abandoned every request `toTool` accepted whose work is gone.
     * `isAlive(request)` says whether the receiver still has the work.
     */
    settleAccepted(toTool, isAlive) {
      let settled = 0;
      for (const h of this.acceptedBy(toTool)) {
        if (!isAlive(h) && this.reply(h.id, { outcome: "abandoned" })) settled++;
      }
      return settled;
    },
    /**
     * Cancel every unanswered request `tool` sent whose asker is gone.
     * `isAlive(request)` says whether what asked (its replyTo.ref) still exists.
     */
    cancelOrphans(tool, isAlive) {
      let cancelled = 0;
      for (const h of this.waitingFrom(tool)) {
        if (!isAlive(h) && this.cancel(h.id, tool)) cancelled++;
      }
      return cancelled;
    },
    /** Send the reply. Written once; ignored for unknown ids, repeats, or an unknown outcome. */
    reply(id, message) {
      this.hydrate();
      if (typeof id !== "string" || !id) return false;
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.reply) return false;
      const clean = normalizeReply(message, h);
      if (!clean) return false;
      h.reply = clean;
      return true;
    },
    /** One request by id, readable only by the tool that sent it or the tool it went to. */
    get(id, tool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      return h && (h.replyTo?.tool === tool || h.to.tool === tool) ? copy(h) : null;
    },
    /** The reply to one request, readable only by the tool that sent it. Null until it arrives. */
    replyFor(id, senderTool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.replyTo?.tool !== senderTool || !h.reply) return null;
      return copy(h.reply);
    },
    /** The request `toTool` accepted into `ref` that has no reply yet, or null. */
    openFor(toTool, ref) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.to.tool === toTool && x.to.ref === ref && x.consumedAt && !x.reply);
      return h ? copy(h) : null;
    },
    /** The sender stops waiting: nothing can accept it later, and it ends as abandoned. */
    cancel(id, senderTool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.replyTo?.tool !== senderTool) return false;
      if (!h.consumedAt) h.consumedAt = new Date().toISOString();
      if (!h.reply) h.reply = normalizeReply({ outcome: "abandoned" }, h);
      return true;
    },
    /** Aggregate replies for everything `tool` sent about `ref`; null when none. */
    summaryFor(tool, ref, want = null) {
      return summarizeReplies(this.handoffs.filter((h) =>
        h.replyTo?.tool === tool && h.replyTo.ref === ref && (want == null || h.want === want)));
    },
    /** Route location for opening a request's receiver. */
    routeFor(handoff) {
      if (!handoff?.to?.tool || !handoff.id) return null;
      return routeForTool(handoff.to.tool, { [HANDOFF_QUERY_PARAM]: handoff.id });
    },
  },
});

// See sessionRunStore.js: keeps HMR from leaving a stale store instance.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHandoffStore, import.meta.hot));
}
