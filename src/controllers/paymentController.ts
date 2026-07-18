import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Order } from "../models/orderModel";
import {
  constructWebhookEvent,
  createCheckoutSessionForOrder,
  isStripeConfigured,
  isStripeWebhookConfigured,
  retrieveCheckoutSession,
} from "../services/stripeService";
import { getSingleValue } from "../utils/request";
import { logAudit, logError } from "../utils/logger";

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

    if (session.metadata?.orderId !== String(order._id)) {
      return res
        .status(400)
        .json({ message: "Payment session does not match this order." });
    }

    const expectedAmount =
      (order.products || []).reduce(
        (sum: number, product: any) =>
          sum + Math.round(Number(product.price) * 100) * Number(product.quantity),
        0
      ) + Math.round(Number(order.deliveryPrice || 0) * 100);

    if (session.currency !== "pln" || Number(session.amount_total) !== expectedAmount) {
      return res
        .status(400)
        .json({ message: "Payment amount does not match this order." });
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

const expectedOrderAmount = (order: any) =>
  (order.products || []).reduce(
    (sum: number, product: any) =>
      sum + Math.round(Number(product.price) * 100) * Number(product.quantity),
    0
  ) + Math.round(Number(order.deliveryPrice || 0) * 100);

const markOrderPaidFromSession = async (session: any) => {
  const orderId = session?.metadata?.orderId;
  if (!orderId || !Types.ObjectId.isValid(String(orderId))) {
    return;
  }

  const order = await Order.findById(orderId);
  if (!order || isPaidOrder(order)) {
    return;
  }

  if (session.payment_status !== "paid") {
    return;
  }

  if (
    session.currency !== "pln" ||
    Number(session.amount_total) !== expectedOrderAmount(order)
  ) {
    logError("stripe_webhook_amount_mismatch", {
      orderId: String(order._id),
      sessionId: session.id,
    });
    return;
  }

  order.paymentStatus = "paid";
  order.paid = true;
  if (order.orderStatus === "pending_payment") {
    order.orderStatus = "paid";
  }
  order.reservationExpiresAt = null;
  await order.save();

  logAudit("payment_confirmed_webhook", {
    orderId: String(order._id),
    sessionId: session.id,
  });
};

const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!isStripeWebhookConfigured()) {
    return res.status(503).json({ message: "Stripe webhook not configured." });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).json({ message: "Missing Stripe signature." });
  }

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, String(signature));
  } catch (error) {
    logError("stripe_webhook_signature_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(400).json({ message: "Invalid Stripe signature." });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await markOrderPaidFromSession(event.data.object);
    }
  } catch (error) {
    logError("stripe_webhook_handler_failed", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return res.status(200).json({ received: true });
};

export default {
  createCheckoutSession,
  confirmPayment,
  handleStripeWebhook,
};
