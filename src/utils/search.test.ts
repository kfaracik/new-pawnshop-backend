import { describe, expect, it } from "vitest";
import { buildSearchRegex, escapeRegex, normalizeSearchQuery } from "./search";

describe("search utils", () => {
  it("escapes regex operators", () => {
    expect(escapeRegex("iphone (13)+")).toBe("iphone \\(13\\)\\+");
  });

  it("normalizes and trims search query", () => {
    expect(normalizeSearchQuery("  gold watch  ")).toBe("gold watch");
  });

  it("builds safe case-insensitive regex", () => {
    const regex = buildSearchRegex("a+b");

    expect(regex?.test("xx a+b yy")).toBe(true);
    expect(regex?.test("aaab")).toBe(false);
  });
});
