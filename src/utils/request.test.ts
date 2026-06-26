import { describe, expect, it } from "vitest";
import { getSingleValue, parsePagination, parsePositiveInteger } from "./request";

describe("request utils", () => {
  it("returns a string as is", () => {
    expect(getSingleValue("abc")).toBe("abc");
  });

  it("returns the first item for arrays", () => {
    expect(getSingleValue(["abc", "def"])).toBe("abc");
  });

  it("returns undefined for missing values", () => {
    expect(getSingleValue(undefined)).toBeUndefined();
  });

  it("clamps positive integers to a max value", () => {
    expect(parsePositiveInteger("999", 10, 50)).toBe(50);
    expect(parsePositiveInteger("-1", 10, 50)).toBe(10);
  });

  it("parses bounded pagination", () => {
    expect(parsePagination({ page: "2", limit: "500" })).toEqual({
      page: 2,
      limit: 50,
      skip: 50,
    });
  });
});
