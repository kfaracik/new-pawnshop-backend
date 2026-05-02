import { describe, expect, it } from "vitest";
import { getSingleValue } from "./request";

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
});
