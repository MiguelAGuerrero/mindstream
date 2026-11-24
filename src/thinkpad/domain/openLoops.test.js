// ThinkPad's open loops (roadmap Phase 4): every unresolved thread, at any
// depth, with its one next step and where to go. Reported by ThinkPad itself;
// Home only lists what each tool reports.
import { describe, expect, it } from "vitest";
import { createPad, setPadText, enterReflect, drillIntoSpan, resolveThreadIntoParent, openLoopsFor } from "./padDomain";
import { makeTestEnv } from "./__testkit__";

function pad(env) {
  let p = createPad({ title: "How do I build a program?", now: env.now }, env);
  p = setPadText(p, { text: "Overload matters most. Bad knee." }, env);
  p = enterReflect(p, {}, env);
  const a = drillIntoSpan(p, { parentThreadId: null, title: "Doubt overload", selectionStart: 0, selectionEnd: 8, selectedText: "Overload" }, env);
  p = setPadText(a.pad, { padLocator: a.frame.id, text: "Volume might matter more.\n\nNot sure." }, env);
  const b = drillIntoSpan(p, { parentThreadId: null, title: "Knee-friendly lifts", selectionStart: 23, selectionEnd: 31, selectedText: "Bad knee" }, env);
  p = setPadText(b.pad, { padLocator: b.frame.id, text: "Split squats." }, env);
  return { p, a: a.frame, b: b.frame };
}

describe("openLoopsFor", () => {
  it("lists each unresolved thread with its next step and a place to open", () => {
    const env = makeTestEnv();
    const { p, a, b } = pad(env);
    expect(openLoopsFor(p)).toEqual([
      expect.objectContaining({ tool: "thinkpad", title: "Doubt overload", where: "How do I build a program?", next: "Keep working it", place: { pad: p.id, thread: a.id } }),
      expect.objectContaining({ tool: "thinkpad", title: "Knee-friendly lifts", next: "Ready to resolve", place: { pad: p.id, thread: b.id } }),
    ]);
  });

  it("leaves resolved threads out", () => {
    const env = makeTestEnv();
    const { p, b } = pad(env);
    const done = resolveThreadIntoParent(p, { threadId: b.id, result: "Split squats and leg curls." }, env).pad;
    expect(openLoopsFor(done).map((l) => l.title)).toEqual(["Doubt overload"]);
  });

  it("finds threads at any depth", () => {
    const env = makeTestEnv();
    let { p, a } = pad(env);
    p = enterReflect(p, { padLocator: a.id }, env);
    const deep = drillIntoSpan(p, { parentThreadId: a.id, title: "Is it?", selectionStart: 0, selectionEnd: 6, selectedText: "Volume" }, env);
    const loops = openLoopsFor(setPadText(deep.pad, { padLocator: deep.frame.id, text: "maybe" }, env));
    expect(loops.map((l) => l.title)).toContain("Is it?");
    expect(loops.find((l) => l.title === "Is it?").place).toEqual({ pad: p.id, thread: deep.frame.id });
  });

  it("is empty for a pad with no threads or no pad", () => {
    const env = makeTestEnv();
    expect(openLoopsFor(createPad({ title: "x", now: env.now }, env))).toEqual([]);
    expect(openLoopsFor(null)).toEqual([]);
  });
});
