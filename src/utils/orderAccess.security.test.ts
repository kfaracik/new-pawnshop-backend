import { describe, expect, it } from "vitest";
import { canAccessOrder, safeOrderView } from "./orderAccess";

describe("canAccessOrder", () => {
  it("allows access to a guest order (no userId) for anyone", () => {
    expect(canAccessOrder({ userId: null }, undefined)).toBe(true);
    expect(canAccessOrder({ userId: undefined }, { _id: "u1" })).toBe(true);
  });

  it("denies an anonymous caller on a user-linked order", () => {
    expect(canAccessOrder({ userId: "owner1" }, undefined)).toBe(false);
    expect(canAccessOrder({ userId: "owner1" }, null)).toBe(false);
  });

  it("allows the owning user and denies a different user", () => {
    expect(canAccessOrder({ userId: "owner1" }, { _id: "owner1" })).toBe(true);
    expect(canAccessOrder({ userId: "owner1" }, { _id: "someone-else" })).toBe(false);
  });

  it("always allows an admin", () => {
    expect(canAccessOrder({ userId: "owner1" }, { _id: "x", isAdmin: true })).toBe(true);
  });
});

describe("safeOrderView — never leaks PII", () => {
  it("returns only safe fields and drops customer PII", () => {
    const view = safeOrderView({
      _id: "order1",
      userId: "owner1",
      paid: true,
      paymentStatus: "paid",
      orderStatus: "paid",
      paymentMethod: "stripe_card",
      // PII that must not survive:
      customer: { name: "Jan Kowalski", email: "jan@example.com" },
      streetAddress: "Al. NMP 1",
    } as any);

    expect(view).toEqual({
      _id: "order1",
      paid: true,
      paymentStatus: "paid",
      orderStatus: "paid",
      paymentMethod: "stripe_card",
    });
    expect(JSON.stringify(view)).not.toContain("jan@example.com");
    expect(JSON.stringify(view)).not.toContain("Kowalski");
    expect(JSON.stringify(view)).not.toContain("NMP");
  });

  it("derives paid from paymentStatus when the flag is absent", () => {
    expect(safeOrderView({ _id: "o", paymentStatus: "paid" } as any).paid).toBe(true);
    expect(safeOrderView({ _id: "o", paymentStatus: "unpaid" } as any).paid).toBe(false);
  });
});
