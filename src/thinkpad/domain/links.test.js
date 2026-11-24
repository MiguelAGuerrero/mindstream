// ---------------------------------------------------------------------------
// Links and "needs a source" (roadmap Revisions 15 and 22).
//
// Attaching a link to a passage is a document action, not an open item. A link
// points at a URL, or at another passage as a snapshot connection: it keeps the
// text and draft version it drew on, and only notes when that passage was later
// refined. "Needs a source" is an open item until a link covers it or it is
// decided at the gate. The document's text never changes; links are written
// out as Markdown when text leaves the pad.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  createPad,
  setPadText,
  padForThread,
  enterReflect,
  addLink,
  addPassageLink,
  removeLink,
  markNeedsSource,
  linksAt,
  openItems,
  disposeOpenItem,
  textWithLinks,
} from "./padDomain";
import { buildPadSnapshot, normalizePad } from "./padPersistenceMapper";
import { makeTestEnv } from "./__testkit__";

const TEXT = "Nippard says overload matters most.\n\nVolume drives growth.";
const root = (pad) => padForThread(pad, null);
const range = (text, words) => ({ selectionStart: text.indexOf(words), selectionEnd: text.indexOf(words) + words.length, selectedText: words });

function pad(env) {
  let p = createPad({ title: "doc", now: env.now }, env);
  p = setPadText(p, { text: TEXT }, env);
  return p;
}

describe("addLink (URL)", () => {
  it("attaches a URL to a passage without changing the text or opening an item", () => {
    const env = makeTestEnv();
    const p = addLink(pad(env), { ...range(TEXT, "Nippard"), href: "https://youtu.be/abc" }, env);
    expect(root(p).text).toBe(TEXT);
    expect(linksAt(p, null)).toEqual([
      expect.objectContaining({ kind: "url", href: "https://youtu.be/abc", selectedText: "Nippard" }),
    ]);
    expect(openItems(p, null)).toEqual([]);
  });

  it("works while writing and while reflecting", () => {
    const env = makeTestEnv();
    const p = addLink(enterReflect(pad(env), {}, env), { ...range(TEXT, "Nippard"), href: "https://youtu.be/abc" }, env);
    expect(linksAt(p, null)).toHaveLength(1);
  });

  it("rejects a non-URL or an empty range (same ref)", () => {
    const env = makeTestEnv();
    const p = pad(env);
    expect(addLink(p, { ...range(TEXT, "Nippard"), href: "not a url" }, env)).toBe(p);
    expect(addLink(p, { selectionStart: 3, selectionEnd: 3, selectedText: "", href: "https://x.y" }, env)).toBe(p);
  });

  it("removeLink takes it off", () => {
    const env = makeTestEnv();
    let p = addLink(pad(env), { ...range(TEXT, "Nippard"), href: "https://youtu.be/abc" }, env);
    p = removeLink(p, { annotationId: linksAt(p, null)[0].annotationId }, env);
    expect(linksAt(p, null)).toEqual([]);
  });
});

describe("addPassageLink (a snapshot connection)", () => {
  it("keeps the text and draft version of the passage it points at", () => {
    const env = makeTestEnv();
    let p = enterReflect(pad(env), {}, env);
    const target = root(p).ideas[1];
    p = addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: target.id }, env);
    expect(linksAt(p, null)[0]).toMatchObject({
      kind: "passage",
      snapshot: "Volume drives growth.",
      draftN: 0,
      refined: false,
      lost: false,
    });
  });

  it("does not change when the target is refined, but says so", () => {
    const env = makeTestEnv();
    let p = pad(env);
    const target = root(p).ideas[1];
    p = addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: target.id }, env);
    p = setPadText(p, { text: "Nippard says overload matters most.\n\nWeekly volume drives growth." }, env);
    expect(linksAt(p, null)[0]).toMatchObject({
      snapshot: "Volume drives growth.",
      current: "Weekly volume drives growth.",
      refined: true,
    });
  });

  it("notes a target that no longer exists as lost", () => {
    const env = makeTestEnv();
    let p = pad(env);
    p = addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: root(p).ideas[1].id }, env);
    p = setPadText(p, { text: "Nippard says overload matters most." }, env);
    expect(linksAt(p, null)[0]).toMatchObject({ snapshot: "Volume drives growth.", lost: true });
  });

  it("rejects linking a passage to its own paragraph or an unknown one (same ref)", () => {
    const env = makeTestEnv();
    const p = pad(env);
    expect(addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: root(p).ideas[0].id }, env)).toBe(p);
    expect(addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: "nope" }, env)).toBe(p);
  });
});

describe("needs a source", () => {
  it("is an open item until a link covers the passage", () => {
    const env = makeTestEnv();
    let p = markNeedsSource(pad(env), range(TEXT, "overload matters most"), env);
    expect(openItems(p, null)).toEqual([expect.objectContaining({ kind: "source", text: "overload matters most" })]);
    p = addLink(p, { ...range(TEXT, "overload"), href: "https://youtu.be/abc" }, env);
    expect(openItems(p, null)).toEqual([]);
  });

  it("can be decided at the gate instead (accepted unsourced)", () => {
    const env = makeTestEnv();
    let p = markNeedsSource(pad(env), range(TEXT, "overload matters most"), env);
    const item = openItems(p, null)[0];
    p = disposeOpenItem(p, { id: item.id, kind: "accepted", note: "common knowledge" }, env);
    expect(openItems(p, null)).toEqual([]);
  });
});

describe("textWithLinks", () => {
  it("writes URL links as Markdown and leaves the rest alone", () => {
    const env = makeTestEnv();
    const p = addLink(pad(env), { ...range(TEXT, "Nippard"), href: "https://youtu.be/abc" }, env);
    expect(textWithLinks(p, null)).toBe("[Nippard](https://youtu.be/abc) says overload matters most.\n\nVolume drives growth.");
  });
});

describe("persistence", () => {
  it("keeps links, needs-a-source marks and tags across save and load", () => {
    const env = makeTestEnv();
    let p = addLink(pad(env), { ...range(TEXT, "Nippard"), href: "https://youtu.be/abc" }, env);
    p = addPassageLink(p, { ...range(TEXT, "overload"), targetIdeaId: root(p).ideas[1].id }, env);
    p = markNeedsSource(p, range(TEXT, "matters most"), env);
    const loaded = normalizePad(JSON.parse(JSON.stringify(buildPadSnapshot(p))), { now: env.now });
    expect(linksAt(loaded, null).map((l) => l.kind).sort()).toEqual(["passage", "url"]);
    expect(openItems(loaded, null).map((i) => i.kind)).toEqual(["source"]);
  });

  it("keeps an annotation's tag (it used to be dropped on load)", () => {
    const loaded = normalizePad({
      id: "pad:1",
      doc: { text: "the mess", annotations: [{ id: "a1", selectionStart: 4, selectionEnd: 8, selectedText: "mess", stepId: "s1", tag: "question" }] },
    }, { now: "2026-11-24T00:00:00.000Z" });
    expect(root(loaded).annotations[0].tag).toBe("question");
  });
});
