// ---------------------------------------------------------------------------
// The lifecycle contract (roadmap Revisions 40-42, CLAUDE.md).
//
// The rule: anything a person can start can be ended, and nothing is listed as
// unfinished without a way to end it. These tests make the rule fail loudly
// instead of relying on anyone remembering it:
//
//   1. Every action of every store is classified in its tool's lifecycle.js,
//      as starting something (with what ends it), ending something, or
//      neither. Adding `startSomething` without saying what ends it fails here.
//   2. Every row a tool reports as unfinished says how it ends: an action Home
//      can run, or the place it opens.
//   3. No code takes a request without an outcome.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePadStore } from "./thinkpad/store/padStore";
import { useSessionRunStore } from "./focus/store/sessionRunStore";
import { useWorkflowStore } from "./workflows/store/workflowStore";
import { useShelfStore } from "./shelf/shelfStore";
import { useHandoffStore } from "./handoff/handoffStore";
import thinkpad from "./thinkpad/lifecycle";
import focus from "./focus/lifecycle";
import workflows from "./workflows/lifecycle";
import shelf from "./shelf/lifecycle";
import handoff from "./handoff/lifecycle";
import { createPad, setPadText, enterReflect, drillIntoSpan, openLoopsFor } from "./thinkpad/domain/padDomain";
import { openLoopsForContexts } from "./focus/model/openLoops";
import { makeTestEnv } from "./thinkpad/domain/__testkit__";

const TOOLS = [
  { name: "thinkpad", manifest: thinkpad, useStore: usePadStore },
  { name: "focus", manifest: focus, useStore: useSessionRunStore },
  { name: "workflows", manifest: workflows, useStore: useWorkflowStore },
  { name: "shelf", manifest: shelf, useStore: useShelfStore },
  { name: "handoff", manifest: handoff, useStore: useHandoffStore },
];

function stubLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

/** A store's own actions: its functions, minus Pinia's ($…) and private (_…) ones. */
function actionsOf(store) {
  return Object.keys(store).filter((k) => typeof store[k] === "function" && !k.startsWith("$") && !k.startsWith("_"));
}

beforeEach(() => {
  stubLocalStorage();
  setActivePinia(createPinia());
});

describe.each(TOOLS)("lifecycle of $name", ({ manifest, useStore }) => {
  it("classifies every store action: it starts something, ends something, or neither", () => {
    const starts = manifest.starts.flatMap((s) => s.start);
    const ends = manifest.starts.flatMap((s) => s.ends);
    const known = new Set([...starts, ...ends, ...manifest.other]);
    const unclassified = actionsOf(useStore()).filter((a) => !known.has(a));
    expect(
      unclassified,
      "New store action(s). In this tool's lifecycle.js, list each under `starts` with what ends it, as an `ends` of something, or under `other`.",
    ).toEqual([]);
  });

  it("gives everything that can be started at least one ending, and every name is a real action", () => {
    const actions = new Set(actionsOf(useStore()));
    for (const entry of manifest.starts) {
      expect(entry.ends.length, `"${entry.what}" has no way to end it`).toBeGreaterThan(0);
      for (const name of [...entry.start, ...entry.ends]) {
        expect(actions.has(name), `"${entry.what}" names "${name}", which is not an action of the store`).toBe(true);
      }
    }
    for (const name of manifest.other) {
      expect(actions.has(name), `"${name}" is listed under other but is not an action of the store`).toBe(true);
    }
  });
});

describe("rows reported as unfinished", () => {
  function sampleLoops() {
    const env = makeTestEnv();
    let pad = createPad({ title: "doc", now: env.now }, env);
    pad = setPadText(pad, { text: "alpha beta gamma" }, env);
    pad = enterReflect(pad, {}, env);
    const d = drillIntoSpan(pad, { parentThreadId: null, title: "Why beta?", selectionStart: 6, selectionEnd: 10, selectedText: "beta" }, env);
    pad = setPadText(d.pad, { padLocator: d.frame.id, text: "a thought" }, env);

    const contexts = [
      { id: 1, stack: [{ id: 2, title: "Live" }] },
      { id: 3, stack: [{ id: 4, title: "Parked" }], parked: true, parkedAt: env.now, waitingOn: "review" },
    ];

    const handoffs = useHandoffStore();
    const pending = handoffs.create({ replyTo: { tool: "thinkpad", ref: "t:1" }, to: { tool: "focus" }, want: "step-through", text: "Pending" });
    const accepted = handoffs.create({ replyTo: { tool: "thinkpad", ref: "t:2" }, to: { tool: "focus" }, want: "step-through", text: "Accepted" });
    handoffs.accept(accepted.id, "focus", "ctx:1");

    return [
      ...openLoopsFor(pad).map((loop) => ({ loop, store: usePadStore() })),
      ...openLoopsForContexts(contexts).map((loop) => ({ loop, store: useSessionRunStore() })),
      ...handoffs.openLoops.map((loop) => ({ loop, store: handoffs })),
      { pending },
    ].filter((x) => x.loop);
  }

  it("each say how they end: an action Home can run, or the place they open", () => {
    const rows = sampleLoops();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const { loop, store } of rows) {
      const label = `${loop.tool} row "${loop.title}" (${loop.next})`;
      if (loop.endsAt !== undefined) {
        expect(loop.endsAt, label).toBe("destination");
        expect(loop.end, `${label} declares both end and endsAt`).toBeUndefined();
        continue;
      }
      expect(loop.end, `${label} has no way to end it`).toBeTruthy();
      expect(typeof loop.end.label, label).toBe("string");
      expect(typeof store[loop.end.action], `${label}: "${loop.end.action}" is not an action of its store`).toBe("function");
      if (loop.end.undo) expect(typeof store[loop.end.undo], `${label}: undo "${loop.end.undo}"`).toBe("function");
    }
  });

  it("a waiting request ended from its row stops waiting", () => {
    const handoffs = useHandoffStore();
    handoffs.create({ replyTo: { tool: "thinkpad", ref: "t:1" }, to: { tool: "focus" }, want: "step-through", text: "x" });
    const [row] = handoffs.openLoops;
    handoffs[row.end.action](row.end.args);
    expect(handoffs.openLoops).toEqual([]);
  });
});

describe("requests between tools", () => {
  function sourceFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(js|vue)$/.test(name) && !/\.test\.js$/.test(name) ? [path] : [];
    });
  }

  it("are never taken without an outcome (no bare consume anywhere in src)", () => {
    const offenders = sourceFiles(join(process.cwd(), "src"))
      .filter((path) => /\.(consume|_take|bindTarget)\(/.test(readFileSync(path, "utf8")) && !path.endsWith("handoffStore.js"));
    expect(offenders, "Use accept(id, tool, ref), answer(id, tool, reply) or decline(id, tool) from the handoff store.").toEqual([]);
  });
});
