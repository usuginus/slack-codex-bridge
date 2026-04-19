import { describe, it, expect } from "vitest";
import { formatSearchConditions } from "./hangout.js";

describe("formatSearchConditions", () => {
  it("parses positional args", () => {
    const result = formatSearchConditions("Downtown 40 4 7:30pm");
    expect(result).toContain("Area=Downtown");
    expect(result).toContain("Budget=40");
    expect(result).toContain("People=4");
    expect(result).toContain("Start=7:30pm");
  });

  it("handles missing args", () => {
    const result = formatSearchConditions("");
    expect(result).toContain("Area=unspecified");
    expect(result).toContain("Budget=unspecified");
  });

  it("handles partial args", () => {
    const result = formatSearchConditions("Shibuya 30");
    expect(result).toContain("Area=Shibuya");
    expect(result).toContain("Budget=30");
    expect(result).toContain("People=unspecified");
  });

  it("parses named parameters", () => {
    const result = formatSearchConditions(
      "area:Midtown budget:50 people:6 time:8pm"
    );
    expect(result).toContain("Area=Midtown");
    expect(result).toContain("Budget=50");
    expect(result).toContain("People=6");
    expect(result).toContain("Start=8pm");
  });

  it("parses partial named parameters", () => {
    const result = formatSearchConditions("area:Brooklyn budget:30");
    expect(result).toContain("Area=Brooklyn");
    expect(result).toContain("Budget=30");
    expect(result).toContain("People=unspecified");
    expect(result).toContain("Start=unspecified");
  });
});
