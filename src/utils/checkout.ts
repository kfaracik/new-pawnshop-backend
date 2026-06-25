const DELIVERY_METHODS = new Set([
  "courier_standard",
  "parcel_locker",
  "store_pickup",
]);

const PAYMENT_METHODS = new Set([
  "bank_transfer",
  "stripe_card",
]);

const DELIVERY_PRICES: Record<string, number> = {
  courier_standard: 16.9,
  parcel_locker: 13.9,
  store_pickup: 0,
};

export type CheckoutSelection = {
  deliveryMethod: string;
  deliveryPrice: number;
  paymentMethod: string;
};

export const normalizeMoney = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Number(parsed.toFixed(2));
};

export const normalizeCheckoutSelection = (value: unknown): CheckoutSelection => {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const deliveryMethod =
    typeof input.deliveryMethod === "string" && DELIVERY_METHODS.has(input.deliveryMethod)
      ? input.deliveryMethod
      : "courier_standard";
  const paymentMethod =
    typeof input.paymentMethod === "string" && PAYMENT_METHODS.has(input.paymentMethod)
      ? input.paymentMethod
      : "bank_transfer";

  return {
    deliveryMethod,
    deliveryPrice: DELIVERY_PRICES[deliveryMethod] ?? normalizeMoney(input.deliveryPrice),
    paymentMethod,
  };
};

export const getDeliveryPrice = (deliveryMethod: string) => DELIVERY_PRICES[deliveryMethod] ?? 0;

export const getDeliveryEtaLabel = (deliveryMethod: string) => {
  switch (deliveryMethod) {
    case "parcel_locker":
      return "24-48 godzin";
    case "store_pickup":
      return "ustalenie indywidualne";
    case "courier_standard":
    default:
      return "1-2 dni robocze";
  }
};

export const getPaymentStatusForMethod = (paymentMethod: string) => {
  if (paymentMethod === "bank_transfer") {
    return "pending";
  }

  return "unpaid";
};

export const isActiveReservationPaymentStatus = (paymentStatus: string) =>
  paymentStatus === "unpaid" || paymentStatus === "pending";

export const getPaymentProvider = (paymentMethod: string) => {
  if (paymentMethod === "stripe_card") {
    return "stripe";
  }

  return "manual";
};
