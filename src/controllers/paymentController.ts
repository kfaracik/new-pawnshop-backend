import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Order } from "../models/orderModel";
import {
  createCheckoutSessionForOrder,
  isStripeConfigured,
  retrieveCheckoutSession,
} from "../services/stripeService";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../utils/logger";

const isPaidOrder = (order: any) =>
  order?.paid === true || order?.paymentStatus === "paid";

const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isStripeConfigured()) {
      return res
        .status(503)
        .json({ message: "Płatności online są chwilowo niedostępne." });
    }

    const id = getSingleValue(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (isPaidOrder(order)) {
      return res.status(200).json({ alreadyPaid: true, url: null });
    }

    if (order.paymentMethod !== "stripe_card") {
      return res
        .status(400)
        .json({ message: "This order is not paid online with Stripe." });
    }

    const session = await createCheckoutSessionForOrder(order);

    order.paymentSessionId = session.id;
    order.paymentSessionStatus = "session_created";
    order.paymentStatus = "pending";
    await order.save();

    logAudit("payment_session_created", {
      orderId: String(order._id),
      sessionId: session.id,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isStripeConfigured()) {
      return res
        .status(503)
        .json({ message: "Płatności online są chwilowo niedostępne." });
    }

    const id = getSingleValue(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (isPaidOrder(order)) {
      return res.status(200).json({ paid: true, order: order.toObject() });
    }

    const sessionId =
      getSingleValue(req.body?.sessionId) || order.paymentSessionId;
    if (!sessionId) {
      return res.status(400).json({ message: "Missing payment session id" });
    }

    const session = await retrieveCheckoutSession(String(sessionId));

    if (session.metadata?.orderId && session.metadata.orderId !== String(order._id)) {
      return res
        .status(400)
        .json({ message: "Payment session does not match this order." });
    }

    if (session.payment_status === "paid") {
      order.paymentStatus = "paid";
      order.paid = true;
      if (order.orderStatus === "pending_payment") {
        order.orderStatus = "paid";
      }
      order.reservationExpiresAt = null;
      await order.save();

      logAudit("payment_confirmed", {
        orderId: String(order._id),
        sessionId: String(sessionId),
      });

      return res.status(200).json({ paid: true, order: order.toObject() });
    }

    return res.status(200).json({
      paid: false,
      paymentStatus: order.paymentStatus,
      stripePaymentStatus: session.payment_status,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createCheckoutSession,
  confirmPayment,
};
