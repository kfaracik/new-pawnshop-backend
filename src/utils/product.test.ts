import { describe, expect, it } from "vitest";
import { normalizeProductInput, validateProductInput } from "./product";

describe("product utils", () => {
  it("normalizes only allowed product fields", () => {
    expect(
      normalizeProductInput({
        title: "  Laptop  ",
        price: "1200",
        images: [" image.jpg ", "", 42],
        category: "507f1f77bcf86cd799439011",
        isAdmin: true,
        $set: { title: "Injected" },
      })
    ).toEqual({
      title: "Laptop",
      price: 1200,
      images: ["image.jpg"],
      category: "507f1f77bcf86cd799439011",
    });
  });

  it("rejects empty update payloads", () => {
    expect(validateProductInput({})).toBe("At least one product field is required");
  });

  it("validates required create payload fields", () => {
    expect(
      validateProductInput(
        {
          title: "Laptop",
          price: 1200,
          category: "507f1f77bcf86cd799439011",
          images: ["image.jpg"],
        },
        { requireRequiredFields: true }
      )
    ).toBe("");
  });
});
