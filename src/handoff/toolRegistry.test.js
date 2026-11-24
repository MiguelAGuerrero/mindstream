import { describe, expect, it } from "vitest";
import {
  HANDOFF_QUERY_PARAM,
  INTENTS,
  TOOLS,
  acceptsIntent,
  getTool,
  routeForTool,
  toolsAccepting,
} from "./toolRegistry.js";

describe("toolRegistry", () => {
  it("describes every tool with name, job, route and icon", () => {
    for (const t of TOOLS) {
      expect(t.name && t.job && t.route.name && t.icon).toBeTruthy();
      expect(Array.isArray(t.accepts)).toBe(true);
    }
  });

  it("focus accepts start-session; thinkpad accepts decompose", () => {
    expect(acceptsIntent("focus", INTENTS.START_SESSION)).toBe(true);
    expect(acceptsIntent("focus", "other")).toBe(false);
    expect(acceptsIntent("focus", INTENTS.DECOMPOSE)).toBe(false);
    expect(acceptsIntent("thinkpad", INTENTS.DECOMPOSE)).toBe(true);
    expect(acceptsIntent("thinkpad", INTENTS.START_SESSION)).toBe(false);
    expect(acceptsIntent("nope", INTENTS.START_SESSION)).toBe(false);
  });

  it("lists tools accepting an intent", () => {
    expect(toolsAccepting(INTENTS.START_SESSION).map((t) => t.id)).toEqual(["focus"]);
    expect(toolsAccepting(INTENTS.DECOMPOSE).map((t) => t.id)).toEqual(["thinkpad"]);
    expect(toolsAccepting(INTENTS.PICK_STEPS).map((t) => t.id)).toEqual(["workflows"]);
    expect(toolsAccepting(INTENTS.SAVE_STEPS).map((t) => t.id)).toEqual(["workflows"]);
    expect(toolsAccepting("unknown")).toEqual([]);
  });

  it("builds routes, carrying only the query it is given", () => {
    expect(routeForTool("focus")).toEqual({ name: "focus" });
    expect(routeForTool("focus", { [HANDOFF_QUERY_PARAM]: "ho:1" })).toEqual({
      name: "focus",
      query: { handoff: "ho:1" },
    });
    expect(routeForTool("nope")).toBe(null);
    expect(getTool("nope")).toBe(null);
  });
});
