/**
 * Public audio API — emit semantic paths; the engine decides what plays.
 *
 * DISABLED for now: the sound packs (src/sfx/packs/) are not in the repo, so
 * these are no-ops. Call sites keep emitting events so audio can come back
 * without touching them. To re-enable, restore the packs and change this file
 * back to:
 *
 *   export { emitAudioEvent, audioPath, setAudioPrefs } from "./router.js";
 *
 * Nothing imports router.js / player.js while disabled, so the packs are never
 * bundled.
 */

/** Join path parts into a dotted audio path ("home", "tool", "hover" → "home.tool.hover"). */
export function audioPath(...parts) {
  return parts.length === 1 ? String(parts[0]) : parts.map(String).join(".");
}

/** No-op while audio is disabled. */
export function emitAudioEvent() {}

/** No-op while audio is disabled. */
export function setAudioPrefs() {}
