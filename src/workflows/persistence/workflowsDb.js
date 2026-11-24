import { normalizeWorkflowRecord } from "../model/workflow.js";

// Workflow-template persistence — its own IndexedDB database, like Focus's, so
// opening it needs no version coordination with the other tools' databases.
const DB_NAME = "mindstream_workflows";
const DB_VERSION = 1;
const STORE_NAME = "workflowsV1";

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
        const request = handler(tx.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
        tx.oncomplete = () => db.close();
      }),
  );
}

/** All stored workflows, normalized. */
export async function getAllWorkflows() {
  const records = await withStore("readonly", (store) => store.getAll());
  return (Array.isArray(records) ? records : []).map(normalizeWorkflowRecord).filter(Boolean);
}

/** Upsert one workflow. Strips Vue reactivity via a JSON clone. */
export async function upsertWorkflow(workflow) {
  if (!workflow?.id) return;
  const plain = JSON.parse(JSON.stringify(workflow));
  await withStore("readwrite", (store) => store.put(plain));
}

export function deleteWorkflow(id) {
  if (!id) return Promise.resolve();
  return withStore("readwrite", (store) => store.delete(id));
}
