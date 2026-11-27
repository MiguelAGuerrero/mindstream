// What a person can start in the workflow library. See CLAUDE.md.
export default {
  store: "workflow",
  starts: [{ what: "a workflow", start: ["create"], ends: ["remove"] }],
  other: ["load", "update", "markUsed", "byId"],
};
