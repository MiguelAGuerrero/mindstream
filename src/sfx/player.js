const POOL_SIZE = 5;

/** @type {Record<string, string>} pack-relative path → bundled URL */
const PACK_URLS = Object.fromEntries(
  Object.entries(
    import.meta.glob("./packs/sci-fi-ui/**/*.wav", { eager: true, query: "?url", import: "default" }),
  ).map(([absPath, url]) => [absPath.replace(/^\.\/packs\/sci-fi-ui\//, ""), url]),
);

/** @type {Record<string, HTMLAudioElement[]>} */
const pools = {};

function poolFor(src) {
  if (!pools[src]) {
    pools[src] = Array.from({ length: POOL_SIZE }, () => {
      const el = new Audio(src);
      el.preload = "auto";
      return el;
    });
  }
  return pools[src];
}

/**
 * @param {string} src bundled asset URL
 */
function playUrl(src) {
  const pool = poolFor(src);
  const free = pool.find((el) => el.paused || el.ended);
  if (free) {
    free.currentTime = 0;
    free.play().catch((err) => console.warn("SFX play failed:", err));
    return;
  }

  const oneOff = new Audio(src);
  oneOff.play().catch((err) => console.warn("SFX play failed:", err));
}

/**
 * @param {string} relativePath path inside packs/sci-fi-ui (forward slashes)
 * @returns {string | null}
 */
export function resolvePackUrl(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  return PACK_URLS[normalized] ?? null;
}

/** @returns {string[]} */
export function listPackAssets() {
  return Object.keys(PACK_URLS).sort();
}

/**
 * Play a file from the sci-fi UI pack by pack-relative path.
 * @param {string} relativePath
 */
export function playPackAsset(relativePath) {
  const url = resolvePackUrl(relativePath);
  if (!url) {
    console.warn(`Unknown pack asset: ${relativePath}`);
    return;
  }
  playUrl(url);
}
