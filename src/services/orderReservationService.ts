import mongoose from "mongoose";
import { ensureDBConnection, isDatabaseReady } from "../config/db";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";
import { isActiveReservationPaymentStatus } from "../utils/checkout";

const RESERVATION_WINDOW_MINUTES = Math.max(
  5,
  Number(process.env.RESERVATION_WINDOW_MINUTES) || 30
);
const RESERVATION_WINDOW_MS = RESERVATION_WINDOW_MINUTES * 60 * 1000;
const SCHEDULER_INTERVAL_MS = 60 * 1000;

export const getReservationExpiresAt = () =>
  new Date(Date.now() + RESERVATION_WINDOW_MS);

export const releaseExpiredReservations = async () => {
  if (!isDatabaseReady()) {
    const connected = await ensureDBConnection();
    if (!connected) {
      return;
    }
  }

  const now = new Date();

  const expiredOrders = await Order.find({
    orderStatus: "pending_payment",
    paymentStatus: { $in: ["unpaid", "pending"] },
    reservationExpiresAt: { $lte: now },
  })
    .select("_id products")
    .lean<any[]>();

  for (const order of expiredOrders) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const freshOrder = await Order.findById(order._id).session(session);

        if (
          !freshOrder ||
          freshOrder.orderStatus !== "pending_payment" ||
          !isActiveReservationPaymentStatus(freshOrder.paymentStatus) ||
          !freshOrder.reservationExpiresAt ||
          freshOrder.reservationExpiresAt > now
        ) {
          return;
        }

        for (const product of freshOrder.products || []) {
          const stockField = product.reservationStockField || "quantity";
          if (stockField === "none") {
            continue;
          }

          await Product.findByIdAndUpdate(
            product.productId,
            {
              $inc: { [stockField]: Number(product.quantity || 0) },
            },
            { session }
          );
        }

        freshOrder.orderStatus = "failed";
        freshOrder.paymentStatus = "failed";
        freshOrder.paid = false;
        freshOrder.reservationExpiresAt = null;
        await freshOrder.save({ session });
      });
    } catch (_error) {
      // ignore single-order failure and continue with next expired reservation
    } finally {
      await session.endSession();
    }
  }
};

export const startOrderReservationScheduler = () => {
  setInterval(() => {
    releaseExpiredReservations().catch(() => undefined);
  }, SCHEDULER_INTERVAL_MS);
};
