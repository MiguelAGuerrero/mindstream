// Pure helpers for painting think-pad annotations as inline highlights.
// Kept DOM-free so they are node-testable (vitest runs without jsdom).

/**
 * Break `text` into an ordered, gap-free list of segments to render in the
 * highlight mirror. Each segment is { start, end, kind } where kind is
 * "plain" | "anchored" (a pending promoted span) | "resolved" (output written
 * back). Offsets are clamped to the text; overlapping annotations are resolved
 * first-wins (a later span that overlaps an emitted one is skipped).
 */
export function computeHighlightSegments(text, annotations = []) {
  const len = (text ?? "").length;
  if (len === 0) return [];

  const spans = (annotations ?? [])
    .map((a) => ({
      start: Math.max(0, Math.min(len, Number(a.selectionStart))),
      end: Math.max(0, Math.min(len, Number(a.selectionEnd))),
      kind: a.hidden === true ? "hidden"
        : a.link?.quote ? "quote"
        : a.link ? "link"
        : a.needsSource === true ? "source"
        : a.resolved === true ? "resolved" : "anchored",
      // Preserved for decoration data-attributes and gutter icon rendering.
      annotationId: a.id ?? null,
      tag: a.tag ?? null,
    }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const segments = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue; // overlaps an already-emitted span — skip
    if (s.start > cursor) segments.push({ start: cursor, end: s.start, kind: "plain" });
    segments.push({ start: s.start, end: s.end, kind: s.kind, annotationId: s.annotationId, tag: s.tag });
    cursor = s.end;
  }
  if (cursor < len) segments.push({ start: cursor, end: len, kind: "plain" });
  return segments;
}

/**
 * One gutter marker per annotation: which line it starts on, its step id, and
 * whether it has been resolved. Lines are split on "\n" (CRLF tolerated).
 */
export function computeGutterMarkers(text, annotations = []) {
  const safe = text ?? "";
  return (annotations ?? [])
    .filter((a) => Number.isFinite(Number(a.selectionStart)) && a.stepId)
    .map((a) => {
      const upto = safe.slice(0, Math.max(0, Math.min(safe.length, Number(a.selectionStart))));
      const lineIndex = (upto.match(/\n/g) || []).length;
      return {
        stepId: a.stepId,
        title: a.stepTitle ?? "",
        lineIndex,
        resolved: a.resolved === true,
      };
    })
    .sort((x, y) => x.lineIndex - y.lineIndex);
}

/** Bare URLs in the text, shown as links without changing the text: [{ start, end, href }]. */
export function findBareUrls(text) {
  const out = [];
  const re = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/gi;
  let m;
  while ((m = re.exec(text ?? "")) !== null) out.push({ start: m.index, end: m.index + m[0].length, href: m[0] });
  return out;
}

/** Lines that name a theme ("# Drivers of growth"), styled as headings; the text is unchanged. */
export function findThemeLines(text) {
  const out = [];
  const re = /(^|\n)(#{1,3} [^\n]+)/g;
  let m;
  while ((m = re.exec(text ?? "")) !== null) {
    const start = m.index + m[1].length;
    out.push({ start, end: start + m[2].length });
  }
  return out;
}
