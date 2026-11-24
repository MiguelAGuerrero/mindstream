import routePackMap from "./route-pack-map.json";
import { playPackAsset } from "./player.js";

/** @type {Partial<Record<string, number>>} ms between repeats (matched on path tail, e.g. tool.hover) */
const COOLDOWN_MS = {
  "tool.hover": 120,
  "idea.hover": 120,
};

const state = {
  muted: false,
  /** @type {Partial<Record<string, number>>} */
  lastPlayedAt: {},
};

/**
 * @param {{ muted?: boolean }} prefs
 */
export function setAudioPrefs({ muted } = {}) {
  if (typeof muted === "boolean") state.muted = muted;
}

/**
 * Build a dot-path from vargs — lodash.get-style.
 *   audioPath('home.tool.hover')  → 'home.tool.hover'
 *   audioPath('home', 'tool', 'hover') → 'home.tool.hover'
 *
 * @param {...string} parts
 * @returns {string}
 */
export function audioPath(...parts) {
  return parts.length === 1
    ? String(parts[0])
    : parts.map(String).join(".");
}

/** @param {string} path */
function lookupPackPath(path) {
  return routePackMap.map?.[path] ?? null;
}

/** @param {string} path */
function cooldownKey(path) {
  const segments = path.split(".");
  return segments.length >= 2 ? segments.slice(-2).join(".") : path;
}

/** @param {string} path */
function onCooldown(path) {
  const ms = COOLDOWN_MS[cooldownKey(path)];
  if (!ms) return false;
  const last = state.lastPlayedAt[path] ?? 0;
  return Date.now() - last < ms;
}

/**
 * Play a mapped sound. Path is vargs or a single dotted string (lodash.get-style):
 *   emitAudioEvent('home.tool.hover')
 *   emitAudioEvent('home', 'tool', 'hover')
 *
 * @param {...string} parts
 */
export function emitAudioEvent(...parts) {
  const path = audioPath(...parts);

  if (state.muted) return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  if (onCooldown(path)) return;

  state.lastPlayedAt[path] = Date.now();

  const packPath = lookupPackPath(path);
  if (packPath) {
    playPackAsset(packPath);
    return;
  }

  if (import.meta.env.DEV) {
    console.warn(`Unmapped audio event: ${path}`);
  }
}
