import { describe, expect, it } from "vitest";
import { computeOrderAmountCents } from "./payment";

describe("computeOrderAmountCents", () => {
  it("sums line items and delivery in integer cents", () => {
    const amount = computeOrderAmountCents({
      products: [
        { price: 4800, quantity: 1 },
        { price: 19.99, quantity: 2 },
      ],
      deliveryPrice: 16.9,
    });
    // 480000 + 2*1999 + 1690
    expect(amount).toBe(480000 + 3998 + 1690);
  });

  it("handles no delivery and empty products", () => {
    expect(computeOrderAmountCents({ products: [], deliveryPrice: 0 })).toBe(0);
    expect(computeOrderAmountCents({})).toBe(0);
  });

  it("avoids floating point drift on typical prices", () => {
    expect(
      computeOrderAmountCents({ products: [{ price: 279.0, quantity: 1 }], deliveryPrice: 13.9 })
    ).toBe(27900 + 1390);
  });
});
