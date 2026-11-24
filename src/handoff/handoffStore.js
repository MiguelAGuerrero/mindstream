// ---------------------------------------------------------------------------
// Handoff store — the shell's one channel between tools. A source tool
// `create`s a handoff and navigates to the target route with only its id; the
// target `peek`s it (to show a ready screen) and `consume`s it exactly once;
// when its work ends it `writeResult`s back, and the source reads
// `summaryFor` next time it opens. Tools never read each other's state.
//
// Persisted as a small localStorage blob (see handoffStorage.js) so a consumed
// handoff stays consumed across reload.
// ---------------------------------------------------------------------------
import { acceptHMRUpdate, defineStore } from "pinia";
import { HANDOFF_QUERY_PARAM, acceptsIntent, routeForTool } from "./toolRegistry.js";
import { createHandoff, normalizeHandoffRecord, normalizeResult, summarizeResults } from "./handoffModel.js";
import { readHandoffs, writeHandoffs } from "./handoffStorage.js";

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
  actions: {
    /** Load persisted handoffs once and write through on every change. Idempotent. */
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
    /** Mint and store a handoff. Returns a copy, or null when the input is invalid. */
    create({ from, to, task } = {}) {
      this.hydrate();
      const now = new Date();
      const id = `ho:${now.getTime().toString(36)}:${(seq++).toString(36)}`;
      const handoff = createHandoff({ from, to, task }, { id, now: now.toISOString() });
      if (!handoff) return null;
      this.handoffs.push(handoff);
      if (this.handoffs.length > MAX_HANDOFFS) this.handoffs.splice(0, this.handoffs.length - MAX_HANDOFFS);
      return copy(handoff);
    },
    _deliverable(id, toTool) {
      if (typeof id !== "string" || !id) return null;
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.consumedAt) return null;
      if (h.to.tool !== toTool || !acceptsIntent(toTool, h.to.intent)) return null;
      return h;
    },
    /** Read a pending handoff without consuming it. Null if missing, consumed, or not for `toTool`. */
    peek(id, toTool) {
      this.hydrate();
      const h = this._deliverable(id, toTool);
      return h ? copy(h) : null;
    },
    /** Take a pending handoff exactly once. A second call returns null. */
    consume(id, toTool) {
      this.hydrate();
      const h = this._deliverable(id, toTool);
      if (!h) return null;
      h.consumedAt = new Date().toISOString();
      return copy(h);
    },
    /** Record the outcome. Written once; ignored for unknown ids, repeats, or invalid results. */
    writeResult(id, result) {
      this.hydrate();
      if (typeof id !== "string" || !id) return false;
      const h = this.handoffs.find((x) => x.id === id);
      const clean = normalizeResult(result);
      if (!h || h.result || !clean) return false;
      h.result = clean;
      return true;
    },
    /** One handoff by id, readable only by the tool that sent it or the tool it targets. */
    get(id, tool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      return h && (h.from.tool === tool || h.to.tool === tool) ? copy(h) : null;
    },
    /** The result written for one handoff, readable only by the tool that sent it. Null until written. */
    resultFor(id, fromTool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.from.tool !== fromTool || !h.result) return null;
      return copy(h.result);
    },
    /** Record where the target put the work (e.g. a pad id) so it can find its way back. Once only. */
    bindTarget(id, toTool, ref) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      const clean = typeof ref === "string" ? ref.trim() : "";
      if (!h || h.to.tool !== toTool || !clean || h.to.ref) return false;
      h.to.ref = clean;
      return true;
    },
    /** The handoff `toTool` accepted into `ref` that has no result yet, or null. */
    openFor(toTool, ref) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.to.tool === toTool && x.to.ref === ref && x.consumedAt && !x.result);
      return h ? copy(h) : null;
    },
    /** The sender gives up waiting: nothing can accept it later, and it records as abandoned. */
    cancel(id, fromTool) {
      this.hydrate();
      const h = this.handoffs.find((x) => x.id === id);
      if (!h || h.from.tool !== fromTool) return false;
      if (!h.consumedAt) h.consumedAt = new Date().toISOString();
      if (!h.result) h.result = { status: "abandoned", minutes: 0 };
      return true;
    },
    /** Aggregate results for everything `tool` sent about `ref`; null when none. */
    summaryFor(tool, ref) {
      return summarizeResults(this.handoffs.filter((h) => h.from.tool === tool && h.from.ref === ref));
    },
    /** Route location for opening a handoff's target tool. */
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
