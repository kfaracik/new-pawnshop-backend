import { describe, expect, it } from "vitest";
import {
  hasInvalidOrderProducts,
  hasMissingCustomerFields,
  normalizeCustomer,
  normalizeOrderProducts,
} from "./order";

describe("order utils", () => {
  it("normalizes customer fields", () => {
    expect(
      normalizeCustomer({
        name: " Jan ",
        email: " TEST@EXAMPLE.COM ",
        city: " Lodz ",
        postalCode: "90-001",
        streetAddress: " Main 1 ",
        country: "PL",
      })
    ).toEqual({
      name: "Jan",
      email: "test@example.com",
      city: "Lodz",
      postalCode: "90-001",
      streetAddress: "Main 1",
      country: "PL",
    });
  });

  it("merges repeated products", () => {
    expect(
      normalizeOrderProducts([
        { productId: "507f1f77bcf86cd799439011", quantity: 1 },
        { productId: "507f1f77bcf86cd799439011", quantity: 2 },
      ])
    ).toEqual([{ productId: "507f1f77bcf86cd799439011", quantity: 3 }]);
  });

  it("detects invalid payloads and missing customer fields", () => {
    expect(
      hasInvalidOrderProducts([{ productId: "bad-id", quantity: 0 }])
    ).toBe(true);
    expect(
      hasMissingCustomerFields(
        normalizeCustomer({
          name: "",
          email: "a@b.com",
          city: "Lodz",
          postalCode: "90-001",
          streetAddress: "Main 1",
          country: "PL",
        })
      )
    ).toBe(true);
  });
});
