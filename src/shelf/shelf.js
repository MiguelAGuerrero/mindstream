// ---------------------------------------------------------------------------
// The shelf (roadmap §4.3, confirmed in Revision 6). A workspace tray of text
// items in transit: where a one-way Send lands when no tool is the obvious
// target. It belongs to the shell, not to any tool. Pure helpers here; the
// store persists them in this browser.
// ---------------------------------------------------------------------------

const MAX_ITEMS = 200;

export function normalizeShelf(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x.id === "string" && typeof x.text === "string" && x.text.trim())
    .map((x) => ({ id: x.id, text: x.text.trim(), from: typeof x.from === "string" ? x.from : null, at: typeof x.at === "string" ? x.at : null }))
    .slice(0, MAX_ITEMS);
}

/** Put text on the shelf (newest first). Same ref for empty text. */
export function addShelfItem(items, { text, from = null } = {}, { id, now } = {}) {
  const body = typeof text === "string" ? text.trim() : "";
  if (!body || typeof id !== "string" || !id) return items;
  return [{ id, text: body, from, at: now ?? null }, ...(items ?? [])].slice(0, MAX_ITEMS);
}

/** Take an item off the shelf. Same ref for an unknown id. */
export function removeShelfItem(items, itemId) {
  if (!(items ?? []).some((x) => x.id === itemId)) return items;
  return items.filter((x) => x.id !== itemId);
}
