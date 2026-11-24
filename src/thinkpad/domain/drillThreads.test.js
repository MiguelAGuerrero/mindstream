// ---------------------------------------------------------------------------
// drillThreadsAt — the threads drilled from one level, at any depth (G6).
//
// The thread list and Continue / Reopen used to exist only at the root. A
// sub-pad is the same primitive as the root, so it lists its own threads too.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { createPad, drillIntoSpan, drillThreadsAt, setPadText, resolveThreadIntoParent, setStepOutput } from "./padDomain";
import { makeTestEnv } from "./__testkit__";

function twoLevels(env) {
  let pad = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "the mess here", annotations: [] } };
  const a = drillIntoSpan(pad, {
    parentThreadId: null, title: "work the mess", selectionStart: 4, selectionEnd: 8, selectedText: "mess",
  }, env);
  pad = setPadText(a.pad, { padLocator: a.frame.id, text: "a smaller tangle" }, env);
  const b = drillIntoSpan(pad, {
    parentThreadId: a.frame.id, title: "untangle", selectionStart: 10, selectionEnd: 16, selectedText: "tangle",
  }, env);
  return { pad: b.pad, child: a.frame, grandchild: b.frame, childAnn: a.annotationId, grandAnn: b.annotationId };
}

describe("drillThreadsAt", () => {
  it("lists the root's threads for a null locator", () => {
    const env = makeTestEnv();
    const { pad, child, childAnn } = twoLevels(env);
    expect(drillThreadsAt(pad, null)).toEqual([
      {
        threadId: child.id,
        annotationId: childAnn,
        title: "work the mess",
        anchorText: "mess",
        hasWork: true,
        completed: false,
        tag: null,
        status: "open",
        caveats: 0,
      },
    ]);
  });

  it("lists a sub-pad's own threads, not the root's", () => {
    const env = makeTestEnv();
    const { pad, child, grandchild, grandAnn } = twoLevels(env);
    const threads = drillThreadsAt(pad, child.id);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      threadId: grandchild.id,
      annotationId: grandAnn,
      title: "untangle",
      anchorText: "tangle",
      hasWork: false,
      completed: false,
    });
  });

  it("returns [] for a level with no threads, an unknown locator, or no pad", () => {
    const env = makeTestEnv();
    const { pad, grandchild } = twoLevels(env);
    expect(drillThreadsAt(pad, grandchild.id)).toEqual([]);
    expect(drillThreadsAt(pad, "nope")).toEqual([]);
    expect(drillThreadsAt(null, null)).toEqual([]);
  });
});

describe("drillThreadsAt status", () => {
  function oneThread(env, text) {
    let pad = { ...createPad({ title: "doc", now: env.now }, env), doc: { text: "the mess here", annotations: [] } };
    const d = drillIntoSpan(pad, {
      parentThreadId: null, title: "mess", selectionStart: 4, selectionEnd: 8, selectedText: "mess",
    }, env);
    pad = text == null ? d.pad : setPadText(d.pad, { padLocator: d.frame.id, text }, env);
    return { pad, id: d.frame.id };
  }

  it("is converged when the thread is down to one block and not yet resolved", () => {
    const env = makeTestEnv();
    const { pad } = oneThread(env, "one clear idea");
    expect(drillThreadsAt(pad, null)[0].status).toBe("converged");
  });

  it("is open while the thread has several blocks", () => {
    const env = makeTestEnv();
    const { pad } = oneThread(env, "first idea\n\nsecond idea");
    expect(drillThreadsAt(pad, null)[0].status).toBe("open");
  });

  it("is open while the thread is empty", () => {
    const env = makeTestEnv();
    const { pad } = oneThread(env, null);
    expect(drillThreadsAt(pad, null)[0].status).toBe("open");
  });

  it("is resolved once its result has come back up", () => {
    const env = makeTestEnv();
    const { pad, id } = oneThread(env, "one clear idea");
    const r = resolveThreadIntoParent(pad, { threadId: id, result: "one clear idea" }, env);
    expect(drillThreadsAt(r.pad, null)[0].status).toBe("resolved");
  });

  it("is resolved as soon as its result is sent up, before the next draft applies it", () => {
    const env = makeTestEnv();
    const { pad, id } = oneThread(env, "one clear idea");
    const stepId = pad.threads.find((t) => t.id === id).steps[0].id;
    const sent = setStepOutput(pad, { stepId, output: "one clear idea" }, env);
    expect(drillThreadsAt(sent, null)[0]).toMatchObject({ status: "resolved", completed: true });
  });
});
