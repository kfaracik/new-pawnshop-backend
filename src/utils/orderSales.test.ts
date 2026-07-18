import { describe, expect, it } from "vitest";
import { buildSalesIncrementOps, buildSalesDecrementOps } from "./orderSales";

describe("orderSales ops builders", () => {
  it("builds increment ops per product with coerced quantity", () => {
    expect(
      buildSalesIncrementOps([
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: "3" },
        { productId: "c", quantity: undefined },
      ])
    ).toEqual([
      { updateOne: { filter: { _id: "a" }, update: { $inc: { salesCount: 2 } } } },
      { updateOne: { filter: { _id: "b" }, update: { $inc: { salesCount: 3 } } } },
      { updateOne: { filter: { _id: "c" }, update: { $inc: { salesCount: 0 } } } },
    ]);
  });

  it("builds clamped decrement ops (never below zero)", () => {
    const ops = buildSalesDecrementOps([{ productId: "a", quantity: 2 }]);
    expect(ops).toEqual([
      {
        updateOne: {
          filter: { _id: "a" },
          update: [
            {
              $set: {
                salesCount: { $max: [0, { $subtract: ["$salesCount", 2] }] },
              },
            },
          ],
        },
      },
    ]);
  });

  it("returns an empty list for no products", () => {
    expect(buildSalesIncrementOps()).toEqual([]);
    expect(buildSalesDecrementOps([])).toEqual([]);
  });
});
