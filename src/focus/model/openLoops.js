// ---------------------------------------------------------------------------
// The runner's open loops (roadmap Phase 4). The runner reports its own
// unfinished work so a workspace view can list it without reading the
// runner's data: every context not yet resolved, with one next step.
// ---------------------------------------------------------------------------

export function openLoopsForContexts(contexts) {
  if (!Array.isArray(contexts)) return [];
  return contexts
    .filter((c) => c && !c.resolved && Array.isArray(c.stack) && c.stack.length)
    .map((c) => {
      const problem = c.stack[0]?.title ?? "";
      const current = c.stack[c.stack.length - 1]?.title ?? problem;
      const loop = {
        tool: "focus",
        id: String(c.id),
        title: problem,
        where: "Focus",
        next: c.parked ? (c.waitingOn ? `Waiting on ${c.waitingOn}` : "Parked") : `Continue: ${current}`,
        place: { context: c.id },
      };
      if (c.parked && typeof c.parkedAt === "string") loop.since = c.parkedAt;
      return loop;
    });
}
