import { describe, expect, it } from "vitest";
import {
  createPad,
  setThinkPadText,
  hideSpan,
  revealHiddenInPad,
  ideasForPanel,
} from "./padDomain";
import { buildPadSnapshot } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

const TEXT = "Highlighting seems a lot better now";

function seededContext() {
  const env = makeTestEnv();
  let pad = createPad({ title: "Working on ThinkPad", now: env.now }, env);
  pad = setThinkPadText(pad, TEXT, env);
  return { pad, env };
}

describe("visibility toggle — hideSpan / revealHiddenInPad", () => {
  it("records a hidden marker over the range without touching the text", () => {
    const { pad, env } = seededContext();
    const next = hideSpan(pad, { selectionStart: 0, selectionEnd: 12, selectedText: "Highlighting" }, env);
    expect(next).not.toBe(pad);
    expect(next.doc.text).toBe(TEXT); // text is never mutated — only collapsed in the view
    const anns = next.doc.annotations;
    expect(anns).toHaveLength(1);
    expect(anns[0]).toMatchObject({
      selectionStart: 0,
      selectionEnd: 12,
      hidden: true,
      stepId: null,
      resolved: false,
    });
  });

  it("is a no-op on an invalid range (same ref)", () => {
    const { pad, env } = seededContext();
    expect(hideSpan(pad, { selectionStart: 5, selectionEnd: 5 }, env)).toBe(pad); // empty
    expect(hideSpan(pad, { selectionStart: 8, selectionEnd: 2 }, env)).toBe(pad); // inverted
  });

  it("revealHiddenInPad drops every hidden marker; the text reappears", () => {
    const { pad, env } = seededContext();
    const hidden = hideSpan(pad, { selectionStart: 0, selectionEnd: 12, selectedText: "Highlighting" }, env);
    const revealed = revealHiddenInPad(hidden, {}, env);
    expect(revealed.doc.annotations).toHaveLength(0);
    expect(revealed.doc.text).toBe(TEXT);
  });

  it("revealHiddenInPad is a no-op when nothing is hidden (same ref)", () => {
    const { pad, env } = seededContext();
    expect(revealHiddenInPad(pad, {}, env)).toBe(pad);
  });

  it("hidden markers never surface as ideas", () => {
    const { pad, env } = seededContext();
    const hidden = hideSpan(pad, { selectionStart: 0, selectionEnd: 12, selectedText: "Highlighting" }, env);
    expect(ideasForPanel(hidden)).toEqual([]);
  });

  it("the hidden flag survives a persistence round-trip", () => {
    const { pad, env } = seededContext();
    const hidden = hideSpan(pad, { selectionStart: 0, selectionEnd: 12, selectedText: "Highlighting" }, env);
    const snapshot = buildPadSnapshot(hidden, { now: env.now });
    expect(snapshot.doc.annotations[0].hidden).toBe(true);
  });
});
