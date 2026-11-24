// ---------------------------------------------------------------------------
// Page breaks for Reflect's Pages view (Revision 35).
//
// A page shows only whole lines: as many as fit, and the first line that does
// not fit starts the next page. Nothing is cut at the edges and nothing is
// repeated. Page 1 is shorter than the rest because the title sits above it.
//
// lines: [{ top, bottom }] in content coordinates (px from the top of the text).
// Returns [{ start, end }]: where each page begins (scroll position) and where
// its last whole line ends.
// ---------------------------------------------------------------------------

/** Merge per-fragment rects into lines (fragments on one line share a top). */
export function linesFromRects(rects, tolerance = 3) {
  const sorted = (rects ?? [])
    .filter((r) => r && Number.isFinite(r.top) && Number.isFinite(r.bottom) && r.bottom > r.top)
    .map((r) => ({ top: r.top, bottom: r.bottom }))
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const lines = [];
  for (const r of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(r.top - last.top) <= tolerance) last.bottom = Math.max(last.bottom, r.bottom);
    else lines.push({ ...r });
  }
  return lines;
}

export function pageBreaks(lines, firstHeight, laterHeight, { pad = 6 } = {}) {
  const ls = (lines ?? []).filter((l) => l.bottom > l.top);
  if (!ls.length || !(firstHeight > 0) || !(laterHeight > 0)) return [{ start: 0, end: 0 }];
  const pages = [];
  let i = 0;
  let start = 0;
  while (i < ls.length) {
    const height = pages.length === 0 ? firstHeight : laterHeight;
    let j = i;
    // Take every line whose bottom fits; always take at least one line.
    while (j + 1 < ls.length && ls[j + 1].bottom - start <= height) j += 1;
    pages.push({ start, end: ls[j].bottom });
    i = j + 1;
    if (i < ls.length) {
      const gap = ls[i].top - ls[j].bottom;
      start = ls[i].top - Math.max(0, Math.min(pad, gap / 2));
    }
  }
  return pages;
}

/** The page showing `scrollTop` (the last page starting at or before it). */
export function pageAt(pages, scrollTop) {
  let k = 0;
  for (let i = 0; i < pages.length; i++) if (pages[i].start <= scrollTop + 2) k = i;
  return k;
}
