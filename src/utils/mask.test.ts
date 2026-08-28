import { describe, expect, it } from "vitest";
import { maskEmail, maskUserRef } from "./mask";

describe("maskEmail", () => {
  it("masks the local part but keeps the domain", () => {
    expect(maskEmail("jan@gmail.com")).toBe("j**@gmail.com");
    expect(maskEmail("a@x.pl")).toBe("a*@x.pl");
  });

  it("returns undefined for non-emails", () => {
    expect(maskEmail(undefined)).toBeUndefined();
    expect(maskEmail(null)).toBeUndefined();
    expect(maskEmail("not-an-email")).toBeUndefined();
  });

  it("never returns the raw local part", () => {
    const masked = maskEmail("johnsmith@example.com");
    expect(masked).not.toContain("johnsmith");
    expect(masked).toMatch(/^j\*+@example\.com$/);
  });
});

describe("maskUserRef", () => {
  it("replaces email with maskedEmail and preserves other fields", () => {
    const ref = maskUserRef({ _id: "u1", email: "jan@gmail.com" });
    expect(ref).toEqual({ _id: "u1", maskedEmail: "j**@gmail.com" });
    expect(ref).not.toHaveProperty("email");
  });

  it("passes through non-object refs untouched", () => {
    expect(maskUserRef(null)).toBeNull();
    expect(maskUserRef("u1")).toBe("u1");
  });
});
