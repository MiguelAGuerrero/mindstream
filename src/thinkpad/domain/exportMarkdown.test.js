// Export one pad to Markdown (roadmap Phase 4): the current draft on top, then
// the threads nested below, each with its state and the passage it came from.
// For a local-only tool this is also the backup.
import { describe, expect, it } from "vitest";
import { createPad, setPadText, enterReflect, drillIntoSpan, resolveThreadIntoParent, addLink, exportPadMarkdown } from "./padDomain";
import { makeTestEnv } from "./__testkit__";

describe("exportPadMarkdown", () => {
  it("writes the draft, its links, and the threads nested below", () => {
    const env = makeTestEnv();
    let p = createPad({ title: "How do I build a program?", now: env.now }, env);
    p = setPadText(p, { text: "Nippard says overload matters most.\n\nBad knee." }, env);
    p = addLink(p, { selectionStart: 0, selectionEnd: 7, selectedText: "Nippard", href: "https://youtu.be/x" }, env);
    p = enterReflect(p, {}, env);
    const a = drillIntoSpan(p, { parentThreadId: null, title: "Knee-friendly lifts", selectionStart: 37, selectionEnd: 45, selectedText: "Bad knee" }, env);
    p = setPadText(a.pad, { padLocator: a.frame.id, text: "Split squats." }, env);
    p = enterReflect(p, { padLocator: a.frame.id }, env);
    const b = drillIntoSpan(p, { parentThreadId: a.frame.id, title: "Which ones?", selectionStart: 0, selectionEnd: 5, selectedText: "Split" }, env);
    p = setPadText(b.pad, { padLocator: b.frame.id, text: "Bulgarian." }, env);

    expect(exportPadMarkdown(p)).toBe([
      "# How do I build a program?",
      "",
      "[Nippard](https://youtu.be/x) says overload matters most.",
      "",
      "Bad knee.",
      "",
      "---",
      "",
      "## Threads",
      "",
      "### Knee-friendly lifts · open", // its inner thread is still undecided
      "",
      "> Bad knee",
      "",
      "Split squats.",
      "",
      "#### Which ones? · ready to resolve",
      "",
      "> Split",
      "",
      "Bulgarian.",
      "",
    ].join("\n"));
  });

  it("leaves out the threads section when there are none, and handles no title", () => {
    const env = makeTestEnv();
    const p = setPadText(createPad({ title: "", now: env.now }, env), { text: "Just a note." }, env);
    expect(exportPadMarkdown(p)).toBe("# Untitled pad\n\nJust a note.\n");
  });

  it("marks resolved threads", () => {
    const env = makeTestEnv();
    let p = enterReflect(setPadText(createPad({ title: "Q", now: env.now }, env), { text: "A mess." }, env), {}, env);
    const a = drillIntoSpan(p, { parentThreadId: null, title: "Sort it", selectionStart: 2, selectionEnd: 6, selectedText: "mess" }, env);
    p = resolveThreadIntoParent(setPadText(a.pad, { padLocator: a.frame.id, text: "plan" }, env), { threadId: a.frame.id, result: "plan" }, env).pad;
    expect(exportPadMarkdown(p)).toContain("### Sort it · resolved");
  });

  it("is empty for no pad", () => {
    expect(exportPadMarkdown(null)).toBe("");
  });
});
