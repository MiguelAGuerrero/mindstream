/**
 * How a document title should be *typeset*, derived purely from its length.
 *
 * A short title is a deliberate label — it reads best as a **heading**. A long
 * title is usually a captured thought or goal (a promoted span becomes its own
 * thread, seeded with the original sentence), which reads best **condensed into
 * a quote**: smaller, italic, accented, and wrapping rather than dominating the
 * page the way a big heading would.
 *
 * The boundary is a character count: roughly a sentence's worth of text is the
 * point where a title stops being a label. It's tuned by feel — raise
 * HEADING_MAX_LENGTH if ordinary descriptive titles flip to a quote too eagerly.
 */
export const HEADING_MAX_LENGTH = 52;

/**
 * "heading" for short titles, "quote" for long ones.
 *
 * Whitespace is trimmed before measuring so a padded title isn't misjudged, and
 * a blank title counts as a heading (it shows the placeholder, which should look
 * like a heading-in-waiting, not an empty quote).
 */
export function titleDisplayMode(title) {
  const trimmed = (title ?? "").trim();
  return trimmed.length > HEADING_MAX_LENGTH ? "quote" : "heading";
}
