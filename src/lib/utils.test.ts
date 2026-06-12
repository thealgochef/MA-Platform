import { describe, expect, it } from "vitest";

import { formatIndustryDisplay } from "@/lib/utils";

describe("formatIndustryDisplay", () => {
  it("returns an em dash for nullish and empty string values", () => {
    expect(formatIndustryDisplay(null)).toBe("—");
    expect(formatIndustryDisplay(undefined)).toBe("—");
    expect(formatIndustryDisplay("")).toBe("—");
    expect(formatIndustryDisplay("   ")).toBe("—");
  });

  it("formats string arrays as comma-separated values", () => {
    expect(formatIndustryDisplay(["Industrial", "Healthcare"])).toBe(
      "Industrial, Healthcare"
    );
  });

  it("parses JSON array strings and formats as comma-separated values", () => {
    expect(formatIndustryDisplay('["Industrial", "Healthcare"]')).toBe(
      "Industrial, Healthcare"
    );
  });

  it("parses Postgres array-like strings and formats as comma-separated values", () => {
    expect(formatIndustryDisplay("{Industrial,Healthcare}")).toBe(
      "Industrial, Healthcare"
    );
  });

  it("parses quoted Postgres elements containing commas", () => {
    expect(formatIndustryDisplay('{"Food, Beverage","Healthcare"}')).toBe(
      "Food, Beverage, Healthcare"
    );
  });

  it("parses unquoted tokens containing apostrophes", () => {
    expect(formatIndustryDisplay("{Children's Services,Healthcare}")).toBe(
      "Children's Services, Healthcare"
    );
  });

  it("parses escaped quotes and backslashes in Postgres array strings", () => {
    expect(
      formatIndustryDisplay('{"He said \\"Hi\\"","Path \\\\ Folder"}')
    ).toBe('He said "Hi", Path \\ Folder');
  });

  it("returns an em dash for empty Postgres arrays", () => {
    expect(formatIndustryDisplay("{}")).toBe("—");
  });

  it("falls back to trimmed string for invalid JSON-like array strings", () => {
    expect(formatIndustryDisplay(' ["Industrial", Healthcare] ')).toBe(
      '["Industrial", Healthcare]'
    );
  });

  it("returns plain string values unchanged aside from trimming", () => {
    expect(formatIndustryDisplay("  Industrial  ")).toBe("Industrial");
  });
});
