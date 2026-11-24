import { normalizeContextRecord } from "../model/session";

// Focus-context persistence — its own IndexedDB database, deliberately NOT
// sharing mindstream_local: padsDb keeps its openDb/withStore private with a
// hardcoded version, and two modules opening one DB at different versions
// throws VersionError. A separate DB needs zero coordination and zero risk to
// ThinkPad persistence. (Roadmap: consolidate into a shared idb helper.)
const DB_NAME = "mindstream_focus";
const DB_VERSION = 1;
const STORE_NAME = "focusContextsV1";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

function withStore(mode, handler) {
  return openDb().then(
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

/** All persisted contexts, normalized, in creation order (numeric id order). */
export async function getAllContexts() {
  const records = await withStore("readonly", (store) => store.getAll());
  return (Array.isArray(records) ? records : [])
    .map((record) => normalizeContextRecord(record))
    .filter(Boolean);
}

/** Upsert one context. Strips Vue reactivity via JSON clone before storing. */
export async function upsertContext(context) {
  if (!context || context.id == null) return;
  let plain;
  try {
    plain = JSON.parse(JSON.stringify(context));
  } catch (error) {
    console.error("Failed to serialize focus context for storage.", error);
    return;
  }
  await withStore("readwrite", (store) => store.put(plain));
}

export function deleteContext(contextId) {
  if (contextId == null) return Promise.resolve();
  return withStore("readwrite", (store) => store.delete(contextId));
}

export function clearContexts() {
  return withStore("readwrite", (store) => store.clear());
}
