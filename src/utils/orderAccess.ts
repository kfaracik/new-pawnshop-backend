type OrderLike = {
  _id?: unknown;
  userId?: unknown;
  paid?: boolean;
  paymentStatus?: string;
  orderStatus?: string;
  paymentMethod?: string;
};

type ActorLike = { _id?: unknown; isAdmin?: boolean } | undefined | null;

// Orders that belong to a registered user may only be touched by that user
// (or an admin). Guest orders (no userId) stay reachable by their id, which
// acts as the checkout-flow capability — but safeOrderView ensures we never
// return customer PII to these endpoints regardless of who calls them.
export const canAccessOrder = (order: OrderLike, actor: ActorLike): boolean => {
  if (actor?.isAdmin) return true;
  if (!order?.userId) return true;
  if (!actor?._id) return false;
  return String(order.userId) === String(actor._id);
};

// Minimal, PII-free projection returned to the (possibly unauthenticated)
// checkout flow. Name/email/address never leave through these endpoints.
export const safeOrderView = (order: OrderLike) => ({
  _id: String(order._id),
  paid: order.paid === true || order.paymentStatus === "paid",
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  paymentMethod: order.paymentMethod,
});
