import { describe, expect, it } from "vitest";
import {
  getDeliveryEtaLabel,
  getDeliveryPrice,
  isActiveReservationPaymentStatus,
  getPaymentProvider,
  getPaymentStatusForMethod,
  normalizeCheckoutSelection,
} from "./checkout";

describe("checkout utils", () => {
  it("normalizes supported selections", () => {
    expect(
      normalizeCheckoutSelection({
        deliveryMethod: "parcel_locker",
        deliveryPrice: "13.9",
        paymentMethod: "stripe_card",
      })
    ).toEqual({
      deliveryMethod: "parcel_locker",
      deliveryPrice: 13.9,
      paymentMethod: "stripe_card",
    });
  });

  it("falls back for invalid values", () => {
    expect(normalizeCheckoutSelection({ deliveryMethod: "x", paymentMethod: "y" })).toEqual({
      deliveryMethod: "courier_standard",
      deliveryPrice: 16.9,
      paymentMethod: "bank_transfer",
    });
  });

  it("returns consistent labels and providers", () => {
    expect(getDeliveryEtaLabel("store_pickup")).toBe("ustalenie indywidualne");
    expect(getDeliveryPrice("courier_standard")).toBe(16.9);
    expect(getPaymentStatusForMethod("bank_transfer")).toBe("pending");
    expect(getPaymentProvider("stripe_card")).toBe("stripe");
  });

  it("treats unpaid and pending payments as active reservations", () => {
    expect(isActiveReservationPaymentStatus("unpaid")).toBe(true);
    expect(isActiveReservationPaymentStatus("pending")).toBe(true);
    expect(isActiveReservationPaymentStatus("paid")).toBe(false);
    expect(isActiveReservationPaymentStatus("failed")).toBe(false);
  });
});
