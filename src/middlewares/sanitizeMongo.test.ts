import { describe, expect, it } from "vitest";
import { scrub } from "./sanitizeMongo";

describe("sanitizeMongo scrub — strips NoSQL operator keys", () => {
  it("removes $-prefixed keys from an object", () => {
    const obj: any = { status: "live", $ne: "x", $gt: 1 };
    scrub(obj);
    expect(obj).toEqual({ status: "live" });
  });

  it("removes dotted keys (dot-notation injection)", () => {
    const obj: any = { "a.b": 1, safe: 2 };
    scrub(obj);
    expect(obj).toEqual({ safe: 2 });
  });

  it("recurses into nested objects and arrays", () => {
    const obj: any = {
      filter: { price: { $gt: 0 }, name: "ok" },
      list: [{ $where: "1" }, { keep: true }],
    };
    scrub(obj);
    expect(obj).toEqual({
      filter: { price: {}, name: "ok" },
      list: [{}, { keep: true }],
    });
  });

  it("leaves clean payloads untouched", () => {
    const obj: any = { email: "a@b.pl", qty: 3, tags: ["x", "y"] };
    scrub(obj);
    expect(obj).toEqual({ email: "a@b.pl", qty: 3, tags: ["x", "y"] });
  });

  it("is safe on null / primitives", () => {
    expect(() => scrub(null)).not.toThrow();
    expect(() => scrub("string")).not.toThrow();
    expect(() => scrub(42)).not.toThrow();
  });
});
