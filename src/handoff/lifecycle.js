// Requests between tools: what starts one and every way it ends. See CLAUDE.md.
export default {
  store: "handoff",
  starts: [
    { what: "a request", start: ["create"], ends: ["answer", "decline", "reply", "cancel", "stopWaiting", "cancelOrphans"] },
    { what: "accepted work on a request", start: ["accept"], ends: ["reply", "cancel", "stopWaiting", "settleAccepted"] },
  ],
  other: ["hydrate", "peek", "get", "replyFor", "openFor", "acceptedBy", "waitingFrom", "summaryFor", "routeFor"],
};
