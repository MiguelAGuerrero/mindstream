import { describe, expect, it } from "vitest";
import { titleDisplayMode, HEADING_MAX_LENGTH } from "./thinkPadTitle";

describe("titleDisplayMode", () => {
  it("treats a short, label-like title as a heading", () => {
    expect(titleDisplayMode("Auth bug")).toBe("heading");
    expect(titleDisplayMode("Mobile onboarding redesign")).toBe("heading");
  });

  it("condenses a long, sentence-like title into a quote", () => {
    expect(
      titleDisplayMode("Long titles should be condensed into a quote while short ones evoke a heading"),
    ).toBe("quote");
  });

  it("treats blank / whitespace / nullish titles as a heading (placeholder state)", () => {
    expect(titleDisplayMode("")).toBe("heading");
    expect(titleDisplayMode("   ")).toBe("heading");
    expect(titleDisplayMode(undefined)).toBe("heading");
    expect(titleDisplayMode(null)).toBe("heading");
  });

  it("measures the trimmed length, ignoring surrounding whitespace", () => {
    const padded = `   ${"a".repeat(HEADING_MAX_LENGTH)}   `;
    expect(titleDisplayMode(padded)).toBe("heading");
  });

  it("flips exactly past HEADING_MAX_LENGTH", () => {
    expect(titleDisplayMode("a".repeat(HEADING_MAX_LENGTH))).toBe("heading");
    expect(titleDisplayMode("a".repeat(HEADING_MAX_LENGTH + 1))).toBe("quote");
  });
});
