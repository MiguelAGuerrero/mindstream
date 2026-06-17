import { normalizePadRecord } from "../domain/padPersistenceMapper";

const DB_NAME = "mindstream_local";
const DB_VERSION = 2;
const STORE_NAME = "resumableContextsV2";

function resolvePadId(record) {
  if (!record || typeof record !== "object") return null;
  const id = record.id ?? record.contextId;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof record.rootProblemId === "number" && Number.isFinite(record.rootProblemId)) {
    return `root:${Math.floor(record.rootProblemId)}`;
  }
  return null;
}

// Read path: any persisted record (v4–v7) → normalized pad.
// Write path: in-memory pad → re-validated record.
// This persistence layer is part of the imperative shell, so it mints the `now`
// fallback for the pure normalizer (the domain itself never reads the clock).
function normalizePadForStorage(record) {
  return normalizePadRecord(record, { now: new Date().toISOString() });
}

function openDb(dbName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "contextId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

function withStore(dbName, mode, handler) {
  return openDb(dbName).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = handler(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed."));
        tx.onabort = () =>
          reject(tx.error ?? new Error("IndexedDB transaction aborted."));
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function getAllPads() {
  const records = await withStore(DB_NAME, "readonly", (store) => store.getAll());
  const normalized = Array.isArray(records)
    ? records.map((record) => normalizePadForStorage(record)).filter(Boolean)
    : [];
  return normalized.toSorted((a, b) => +toDate(b.updatedAt) - +toDate(a.updatedAt));
}

export function upsertPad(record) {
  return savePad(record);
}

export function deletePad(padId) {
  const resolved =
    typeof padId === "string" && padId.trim()
      ? padId.trim()
      : (typeof padId === "number" && Number.isFinite(padId)
          ? `root:${Math.floor(padId)}`
          : null);
  if (!resolved) return Promise.resolve();
  return withStore(DB_NAME, "readwrite", (store) => store.delete(resolved));
}

export function clearPads() {
  return clearPadStore();
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(+parsed)) return parsed;
  }
  return new Date(0);
}

export async function getLatestPad() {
  const all = await getAllPads();
  return all[0] ?? null;
}

export async function savePad(record) {
  const resolved = resolvePadId(record);
  const normalized = normalizePadForStorage({
    ...record,
    id: resolved,
    contextId: resolved,
  });
  if (!normalized) return;
  // Defensive: structured-clone via JSON to strip Vue reactivity proxies and
  // any other non-cloneable references the caller may have leaked in.
  // contextId must be present: it is the IndexedDB keyPath for the store.
  let plain;
  try {
    plain = JSON.parse(JSON.stringify({ ...normalized, contextId: normalized.id }));
  } catch (error) {
    console.error("Failed to serialize pad for storage.", error);
    return;
  }
  await withStore(DB_NAME, "readwrite", (store) => store.put(plain));
}

export function clearPadStore() {
  return withStore(DB_NAME, "readwrite", (store) => store.clear());
}
