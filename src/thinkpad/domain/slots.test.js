// Slotting a workflow into a thread (roadmap Phase 2: "a step is the same
// primitive again; write it directly or slot a workflow into it"). ThinkPad
// asks the library for steps; the pad remembers which thread is waiting, and
// the reply is written into that thread as a heading per step.
import { describe, expect, it } from "vitest";
import { createPad, setPadText, padForThread, enterReflect, drillIntoSpan, addPendingSlot, applySlot, dropSlot } from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

function withThread(env, text = "") {
  let pad = setPadText(createPad({ title: "doc", now: env.now }, env), { text: "Overload matters most." }, env);
  pad = enterReflect(pad, {}, env);
  const d = drillIntoSpan(pad, { parentThreadId: null, title: "Doubt it", selectionStart: 0, selectionEnd: 8, selectedText: "Overload" }, env);
  pad = text ? setPadText(d.pad, { padLocator: d.frame.id, text }, env) : d.pad;
  return { pad, thread: d.frame };
}

describe("slots", () => {
  it("writes the reply's steps into the waiting thread, after what is there", () => {
    const env = makeTestEnv();
    let { pad, thread } = withThread(env, "My first thought.");
    pad = addPendingSlot(pad, { handoffId: "h1", threadId: thread.id }, env);
    expect(pad.pendingSlots).toEqual([{ handoffId: "h1", threadId: thread.id }]);
    pad = applySlot(pad, { handoffId: "h1", steps: [{ prompt: "What would make this false?" }, { prompt: "What is the evidence?" }] }, env);
    expect(padForThread(pad, thread.id).text).toBe("My first thought.\n\n# What would make this false?\n\n# What is the evidence?");
    expect(pad.pendingSlots).toEqual([]);
  });

  it("fills an empty thread with the form alone", () => {
    const env = makeTestEnv();
    let { pad, thread } = withThread(env);
    pad = addPendingSlot(pad, { handoffId: "h1", threadId: thread.id }, env);
    pad = applySlot(pad, { handoffId: "h1", steps: [{ prompt: "Steelman it." }] }, env);
    expect(padForThread(pad, thread.id).text).toBe("# Steelman it.");
  });

  it("dropSlot forgets a request that came back empty or was abandoned", () => {
    const env = makeTestEnv();
    let { pad, thread } = withThread(env);
    pad = addPendingSlot(pad, { handoffId: "h1", threadId: thread.id }, env);
    pad = dropSlot(pad, { handoffId: "h1" }, env);
    expect(pad.pendingSlots).toEqual([]);
  });

  it("ignores unknown handoffs and threads (same ref)", () => {
    const env = makeTestEnv();
    const { pad } = withThread(env);
    expect(applySlot(pad, { handoffId: "nope", steps: [{ prompt: "x" }] }, env)).toBe(pad);
    expect(addPendingSlot(pad, { handoffId: "h", threadId: "nope" }, env)).toBe(pad);
    expect(dropSlot(pad, { handoffId: "nope" }, env)).toBe(pad);
  });

  it("survives save and load, so a reload while in the library loses nothing", () => {
    const env = makeTestEnv();
    let { pad, thread } = withThread(env);
    pad = addPendingSlot(pad, { handoffId: "h1", threadId: thread.id }, env);
    const loaded = normalizePad(JSON.parse(JSON.stringify(buildPadSnapshot(pad))), { now: env.now });
    expect(loaded.pendingSlots).toEqual([{ handoffId: "h1", threadId: thread.id }]);
  });
});
