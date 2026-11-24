import { describe, expect, it } from "vitest";
import { linesFromRects, pageBreaks, pageAt } from "./pageBreaks";

// Ten lines, 20px tall with 6px between them (top = 26k).
const LINES = Array.from({ length: 10 }, (_, k) => ({ top: 26 * k, bottom: 26 * k + 20 }));

describe("linesFromRects", () => {
  it("merges fragments on the same line and sorts by top", () => {
    expect(linesFromRects([{ top: 30, bottom: 50 }, { top: 0, bottom: 20 }, { top: 1, bottom: 21 }])).toEqual([
      { top: 0, bottom: 21 },
      { top: 30, bottom: 50 },
    ]);
  });
});

describe("pageBreaks", () => {
  it("puts only whole lines on a page and starts the next at the first that did not fit", () => {
    const pages = pageBreaks(LINES, 100, 100);
    // 100px holds lines 0..3 (bottom 98); line 4 (bottom 124) starts page 2.
    expect(pages[0]).toEqual({ start: 0, end: 98 });
    expect(pages[1].start).toBe(104 - 3);
    expect(pages[1].end).toBe(176); // lines 4..6 fit (bottom 176 - 101 = 75 <= 100; line 7 would be 202 - 101 > 100)
  });

  it("never repeats or skips a line", () => {
    const pages = pageBreaks(LINES, 80, 120);
    const shown = LINES.filter((l) => pages.some((p) => l.top >= p.start - 0.01 && l.bottom <= p.end + 0.01));
    expect(shown).toHaveLength(LINES.length);
    for (let k = 1; k < pages.length; k++) expect(pages[k].start).toBeGreaterThan(pages[k - 1].end - 0.01);
  });

  it("makes page 1 shorter than the rest (the title is above it)", () => {
    const pages = pageBreaks(LINES, 50, 200);
    expect(pages[0].end).toBe(46); // two lines
    expect(pages[1].end - pages[1].start).toBeLessThanOrEqual(200);
  });

  it("takes at least one line even when a line is taller than the page", () => {
    expect(pageBreaks([{ top: 0, bottom: 300 }], 100, 100)).toEqual([{ start: 0, end: 300 }]);
  });

  it("is one empty page with no lines", () => {
    expect(pageBreaks([], 100, 100)).toEqual([{ start: 0, end: 0 }]);
  });
});

describe("pageAt", () => {
  it("finds the page that starts at or before a scroll position", () => {
    const pages = pageBreaks(LINES, 100, 100);
    expect(pageAt(pages, 0)).toBe(0);
    expect(pageAt(pages, pages[1].start)).toBe(1);
    expect(pageAt(pages, pages[1].start + 10)).toBe(1);
  });
});
