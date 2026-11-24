// An item accepted at the gate ("go ahead anyway") travels up with the result
// as a caveat (capture-templates §8.2; roadmap §4.2: shown with the result).
import { describe, expect, it } from "vitest";
import {
  createPad, setPadText, padForThread, enterReflect, drillIntoSpan, openItems, disposeOpenItem,
  resolveThreadIntoParent, drillThreadsAt, caveatsFor,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

function scenario(env, note) {
  let pad = enterReflect(setPadText(createPad({ title: "doc", now: env.now }, env), { text: "Overload matters most." }, env), {}, env);
  const t = drillIntoSpan(pad, { parentThreadId: null, title: "Doubt", selectionStart: 0, selectionEnd: 8, selectedText: "Overload" }, env);
  pad = setPadText(t.pad, { padLocator: t.frame.id, text: "Volume may matter more." }, env);
  pad = enterReflect(pad, { padLocator: t.frame.id }, env);
  const inner = drillIntoSpan(pad, { parentThreadId: t.frame.id, title: "Is it?", selectionStart: 0, selectionEnd: 6, selectedText: "Volume" }, env);
  pad = inner.pad;
  const item = openItems(pad, t.frame.id)[0];
  pad = disposeOpenItem(pad, { padLocator: t.frame.id, id: item.id, kind: "accepted", note }, env);
  pad = resolveThreadIntoParent(pad, { threadId: t.frame.id, result: "Volume, progressed over time." }, env).pad;
  return { pad, thread: t.frame, annotationId: t.annotationId };
}

describe("caveats", () => {
  it("carries an accepted item's note up with the result", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = scenario(env, "not yet checked against studies");
    expect(caveatsFor(pad, null, annotationId)).toEqual(["not yet checked against studies"]);
    expect(drillThreadsAt(pad, null)[0]).toMatchObject({ status: "resolved", caveats: 1 });
  });

  it("uses the item's own text when no note was written", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = scenario(env, "");
    expect(caveatsFor(pad, null, annotationId)).toEqual(["Is it?"]);
  });

  it("survives save and load", () => {
    const env = makeTestEnv();
    const { pad, annotationId } = scenario(env, "unchecked");
    const loaded = normalizePad(JSON.parse(JSON.stringify(buildPadSnapshot(pad))), { now: env.now });
    expect(caveatsFor(loaded, null, annotationId)).toEqual(["unchecked"]);
  });
});
