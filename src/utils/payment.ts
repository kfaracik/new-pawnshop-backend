type PaymentOrder = {
  products?: Array<{ price: unknown; quantity: unknown }>;
  deliveryPrice?: unknown;
};

const toCents = (value: unknown) => Math.round(Number(value) * 100);

export const computeOrderAmountCents = (order: PaymentOrder) =>
  (order.products || []).reduce(
    (sum, product) => sum + toCents(product.price) * Number(product.quantity),
    0
  ) + Math.round(Number(order.deliveryPrice || 0) * 100);
