import { describe, expect, it } from "vitest";
import { normalizeCheckoutSelection } from "./checkout";

describe("normalizeCheckoutSelection — price is server-authoritative", () => {
  it("ignores a client-supplied deliveryPrice for a known method", () => {
    const result = normalizeCheckoutSelection({
      deliveryMethod: "courier_standard",
      deliveryPrice: 0,
      paymentMethod: "stripe_card",
    });
    expect(result.deliveryPrice).toBe(16.9);
  });

  it("falls back to the standard courier for an unknown method (never client price)", () => {
    const result = normalizeCheckoutSelection({
      deliveryMethod: "free_ship_hack",
      deliveryPrice: -999,
      paymentMethod: "stripe_card",
    });
    expect(result.deliveryMethod).toBe("courier_standard");
    expect(result.deliveryPrice).toBe(16.9);
  });

  it("free store pickup stays free", () => {
    const result = normalizeCheckoutSelection({
      deliveryMethod: "store_pickup",
      deliveryPrice: 500,
      paymentMethod: "bank_transfer",
    });
    expect(result.deliveryPrice).toBe(0);
  });
});
