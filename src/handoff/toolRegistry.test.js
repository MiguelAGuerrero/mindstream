import { describe, expect, it } from "vitest";
import { HANDOFF_QUERY_PARAM, TOOLS, WANTS, getTool, routeForTool, serves, toolsFor } from "./toolRegistry.js";

describe("toolRegistry", () => {
  it("describes every tool with name, job, route, icon and what it receives", () => {
    for (const t of TOOLS) {
      expect(t.name && t.job && t.route.name && t.icon).toBeTruthy();
      expect(Array.isArray(t.receives.wants)).toBe(true);
      expect(["any", "text", "none"]).toContain(t.receives.steps);
    }
  });

  it("routes each verb to the tool that serves it", () => {
    expect(toolsFor(WANTS.STEP_THROUGH).map((t) => t.id)).toEqual(["focus"]);
    expect(toolsFor(WANTS.THINK).map((t) => t.id)).toEqual(["thinkpad"]);
    expect(toolsFor(WANTS.CHOOSE_STEPS).map((t) => t.id)).toEqual(["workflows"]);
    expect(toolsFor(WANTS.KEEP).map((t) => t.id)).toEqual(["workflows"]);
    expect(toolsFor("unknown")).toEqual([]);
  });

  it("checks whether a tool can take the steps a request carries", () => {
    const text = [{ prompt: "a", produces: "text" }];
    const action = [{ prompt: "a", produces: "action" }];
    expect(serves("focus", WANTS.STEP_THROUGH, action)).toBe(true);
    expect(serves("thinkpad", WANTS.THINK)).toBe(true);
    expect(serves("thinkpad", WANTS.THINK, text)).toBe(false); // ThinkPad takes no steps yet
    expect(serves("focus", WANTS.THINK)).toBe(false);
    expect(serves("nope", WANTS.THINK)).toBe(false);
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
