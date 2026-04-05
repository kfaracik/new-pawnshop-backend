import mongoose from "mongoose";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";

const RESERVATION_WINDOW_MS = 48 * 60 * 60 * 1000;
const SCHEDULER_INTERVAL_MS = 60 * 1000;

export const getReservationExpiresAt = () =>
  new Date(Date.now() + RESERVATION_WINDOW_MS);

export const releaseExpiredReservations = async () => {
  const now = new Date();

  const expiredOrders = await Order.find({
    orderStatus: "pending_payment",
    paymentStatus: "unpaid",
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
          freshOrder.paymentStatus !== "unpaid" ||
          !freshOrder.reservationExpiresAt ||
          freshOrder.reservationExpiresAt > now
        ) {
          return;
        }

        for (const product of freshOrder.products || []) {
          await Product.findByIdAndUpdate(
            product.productId,
            {
              $inc: { quantity: Number(product.quantity || 0) },
            },
            { session }
          );
        }

        freshOrder.orderStatus = "failed";
        freshOrder.paymentStatus = "failed";
        freshOrder.paid = false;
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
