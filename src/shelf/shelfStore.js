// The shelf's store (roadmap §4.3): the workspace's tray of text in transit,
// kept in this browser. Owned by the shell; tools only add to it through Send.
import { defineStore } from "pinia";
import { addShelfItem, normalizeShelf, removeShelfItem } from "./shelf.js";

const KEY = "mindstream.shelf";
let seq = 0;

function read() {
  try { return normalizeShelf(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { return []; }
}
function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: keep in memory */ }
}

export const useShelfStore = defineStore("shelf", {
  state: () => ({ items: typeof localStorage === "undefined" ? [] : read() }),
  actions: {
    add({ text, from = null } = {}) {
      const next = addShelfItem(this.items, { text, from }, { id: `shelf:${Date.now().toString(36)}:${seq++}`, now: new Date().toISOString() });
      if (next === this.items) return false;
      this.items = next;
      write(next);
      return true;
    },
    remove(id) {
      const next = removeShelfItem(this.items, id);
      if (next === this.items) return;
      this.items = next;
      write(next);
    },
  },
});
