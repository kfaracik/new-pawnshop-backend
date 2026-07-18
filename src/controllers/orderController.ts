import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";
import { getReservationExpiresAt } from "../services/orderReservationService";
import ProductService from "../services/productService";
import { sendOrderConfirmation } from "../services/mailService";
import { logAudit } from "../utils/logger";
import {
  getDeliveryEtaLabel,
  getPaymentProvider,
  getPaymentStatusForMethod,
  isActiveReservationPaymentStatus,
  normalizeCheckoutSelection,
} from "../utils/checkout";
import {
  hasInvalidOrderProducts,
  hasMissingCustomerFields,
  normalizeCustomer,
  normalizeOrderProducts,
} from "../utils/order";
import { getSingleValue } from "../utils/request";

const TERMINAL_ORDER_STATUSES = new Set(["completed", "canceled", "failed"]);
const STOCK_RESTORE_ORDER_STATUSES = new Set(["canceled", "failed"]);
const PAID_PAYMENT_STATUSES = new Set(["paid"]);
const UNPAID_PAYMENT_STATUSES = new Set(["unpaid", "failed", "canceled"]);
const ORDER_STATUSES = new Set([
  "pending_payment",
  "paid",
  "completed",
  "canceled",
  "failed",
]);
const PAYMENT_STATUSES = new Set([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "canceled",
  "refunded",
]);

const isActiveReservedOrder = (order: any) =>
  order?.orderStatus === "pending_payment" &&
  isActiveReservationPaymentStatus(order?.paymentStatus) &&
  Boolean(order?.reservationExpiresAt);

const resolveReservationStockField = (product: any) => {
  if (Number.isFinite(Number(product?.quantity))) {
    return "quantity";
  }

  if (Number.isFinite(Number(product?.stock))) {
    return "stock";
  }

  return "none";
};

const restoreOrderStock = async (order: any, session?: mongoose.ClientSession) => {
  for (const product of order?.products || []) {
    const stockField = product.reservationStockField || "quantity";
    if (stockField === "none") {
      continue;
    }

    await Product.findByIdAndUpdate(
      product.productId,
      {
        $inc: { [stockField]: Number(product.quantity || 0) },
      },
      session ? { session } : undefined
    );
  }
};

const resolveProductAvailabilityQuantity = (product: any) => {
  const fromQuantity = Number(product?.quantity);
  if (Number.isFinite(fromQuantity)) {
    return Math.max(0, fromQuantity);
  }

  const fromStock = Number(product?.stock);
  if (Number.isFinite(fromStock) && fromStock > 0) {
    return Math.max(0, fromStock);
  }

  return Infinity;
};

const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find()
      .populate("userId", "_id email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user?._id && !user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const filter: any = { $or: [] };

    if (user?._id && Types.ObjectId.isValid(String(user._id))) {
      filter.$or.push({ userId: user._id });
    }

    if (user?.email) {
      filter.$or.push({ "customer.email": String(user.email).toLowerCase() });
    }

    if (!filter.$or.length) {
      return res.status(200).json([]);
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  const unavailableProducts: string[] = [];

  try {
    const { name, email, city, postalCode, streetAddress, country, products } = req.body || {};
    const checkoutSelection = normalizeCheckoutSelection(req.body);
    const normalizedCustomer = normalizeCustomer({
      name,
      email,
      city,
      postalCode,
      streetAddress,
      country,
    });

    if (hasMissingCustomerFields(normalizedCustomer)) {
      return res.status(400).json({ message: "Missing customer details" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Order must include at least one product" });
    }

    const normalizedProducts = normalizeOrderProducts(products);

    if (hasInvalidOrderProducts(normalizedProducts)) {
      return res.status(400).json({ message: "Invalid order products payload" });
    }

    const uniqueProductIds = [...new Set(normalizedProducts.map((item) => item.productId))];
    let createdOrder: any = null;

    await session.withTransaction(async () => {
      const dbProducts = await Product.find({ _id: { $in: uniqueProductIds } })
        .select("_id title price quantity stock")
        .session(session)
        .lean<any[]>();

      const productsById = new Map(dbProducts.map((p) => [String(p._id), p]));
      const orderProducts: Array<{
        productId: any;
        name: string;
        price: number;
        quantity: number;
        reservationStockField: string;
      }> = [];

      for (const item of normalizedProducts) {
        const dbProduct = productsById.get(item.productId);

        if (!dbProduct) {
          unavailableProducts.push(item.productId);
          continue;
        }

        const availableQuantity = resolveProductAvailabilityQuantity(dbProduct);
        if (availableQuantity < item.quantity) {
          unavailableProducts.push(String(dbProduct._id));
          continue;
        }

        const reservationStockField = resolveReservationStockField(dbProduct);
        if (reservationStockField !== "none") {
          const updated = await Product.findOneAndUpdate(
            {
              _id: new Types.ObjectId(item.productId),
              [reservationStockField]: { $gte: item.quantity },
            },
            {
              $inc: { [reservationStockField]: -item.quantity },
            },
            {
              new: true,
              session,
            }
          );

          if (!updated) {
            unavailableProducts.push(String(dbProduct._id));
            continue;
          }
        }

        orderProducts.push({
          productId: dbProduct._id,
          name: dbProduct.title,
          price: Number(dbProduct.price),
          quantity: item.quantity,
          reservationStockField,
        });
      }

      if (unavailableProducts.length > 0) {
        throw new Error("ORDER_UNAVAILABLE_PRODUCTS");
      }

      const totalAmount = orderProducts.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0
      );
      const grandTotal = Number((totalAmount + checkoutSelection.deliveryPrice).toFixed(2));
      const paymentMethod = checkoutSelection.paymentMethod;

      const [newOrder] = await Order.create(
        [
          {
            userId: req.user?._id && Types.ObjectId.isValid(String(req.user._id)) ? req.user._id : null,
            customer: normalizedCustomer,
            products: orderProducts,
            totalAmount,
            subtotalAmount: totalAmount,
            deliveryPrice: checkoutSelection.deliveryPrice,
            grandTotal,
            deliveryMethod: checkoutSelection.deliveryMethod,
            deliveryEtaLabel: getDeliveryEtaLabel(checkoutSelection.deliveryMethod),
            paymentMethod,
            paymentProvider: getPaymentProvider(paymentMethod),
            paymentSessionStatus:
              paymentMethod === "stripe_card" ? "sandbox_ready" : "not_started",
            paymentNotes:
              paymentMethod === "stripe_card"
                ? "Stripe sandbox can be connected later without changing checkout UX."
                : "Awaiting manual bank transfer confirmation.",
            orderStatus: "pending_payment",
            paymentStatus: getPaymentStatusForMethod(paymentMethod),
            paid: false,
            reservationExpiresAt: getReservationExpiresAt(),
          },
        ],
        { session }
      );

      createdOrder = newOrder;
    });

    logAudit("order_created", {
      orderId: createdOrder?._id,
      userId: req.user?._id,
      totalAmount: createdOrder?.grandTotal,
      paymentMethod: createdOrder?.paymentMethod,
      deliveryMethod: createdOrder?.deliveryMethod,
    });

    return res.status(201).json(createdOrder);
  } catch (error: any) {
    if (error?.message === "ORDER_UNAVAILABLE_PRODUCTS") {
      return res.status(409).json({
        message:
          "Niektóre produkty z koszyka są już niedostępne lub zarezerwowane przez innego użytkownika.",
        unavailableProductIds: [...new Set(unavailableProducts)],
      });
    }

    next(error);
  } finally {
    await session.endSession();
  }
};

const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();

  try {
    const id = getSingleValue(req.params.id);
    const { orderStatus, paymentStatus, paid } = req.body || {};
    let updatedOrder: any = null;
    let shouldEmailConfirmation = false;

    if (!id) {
      return res.status(400).json({ message: "Order id is required" });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    if (orderStatus !== undefined && !ORDER_STATUSES.has(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    if (paymentStatus !== undefined && !PAYMENT_STATUSES.has(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const previousOrderStatus = order.orderStatus;
      const previousPaymentStatus = order.paymentStatus;
      const wasActiveReservation = isActiveReservedOrder(order);

      if (orderStatus) {
        order.orderStatus = orderStatus;
      }

      if (paymentStatus) {
        order.paymentStatus = paymentStatus;
      }

      if (order.orderStatus === "pending_payment") {
        if (order.paymentStatus === "failed") {
          order.orderStatus = "failed";
        } else if (order.paymentStatus === "canceled") {
          order.orderStatus = "canceled";
        }
      }

      if (typeof paid === "boolean") {
        order.paid = paid;
      }

      let becamePaid = false;
      if (PAID_PAYMENT_STATUSES.has(order.paymentStatus)) {
        order.paid = true;
        if (order.orderStatus === "pending_payment") {
          order.orderStatus = "paid";
        }
        order.reservationExpiresAt = null;
        becamePaid = !order.salesCounted;
        if (becamePaid) {
          shouldEmailConfirmation = true;
        }
        await ProductService.recordOrderSales(order, session);
      } else if (UNPAID_PAYMENT_STATUSES.has(order.paymentStatus) && typeof paid !== "boolean") {
        order.paid = false;
      }

      if (TERMINAL_ORDER_STATUSES.has(order.orderStatus)) {
        order.reservationExpiresAt = null;
      }

      const shouldRestoreStock =
        wasActiveReservation &&
        STOCK_RESTORE_ORDER_STATUSES.has(order.orderStatus) &&
        !STOCK_RESTORE_ORDER_STATUSES.has(previousOrderStatus);

      const becameRefunded =
        order.paymentStatus === "refunded" &&
        previousPaymentStatus !== "refunded";

      if (becameRefunded) {
        if (!shouldRestoreStock) {
          await restoreOrderStock(order, session);
        }
        await ProductService.reverseOrderSales(order, session);
        order.paid = false;
      }

      if (shouldRestoreStock) {
        await restoreOrderStock(order, session);
      }

      await order.save({ session });
      updatedOrder = order.toObject();
    });

    if (shouldEmailConfirmation && updatedOrder) {
      void sendOrderConfirmation(updatedOrder);
    }

    logAudit("order_updated", {
      orderId: updatedOrder?._id,
      userId: req.user?._id,
      orderStatus: updatedOrder?.orderStatus,
      paymentStatus: updatedOrder?.paymentStatus,
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    if ((error as Error)?.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Order not found" });
    }

    next(error);
  } finally {
    await session.endSession();
  }
};

const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();

  try {
    const id = getSingleValue(req.params.id);
    let deletedOrder: any = null;

    if (!id) {
      return res.status(400).json({ message: "Order id is required" });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (isActiveReservedOrder(order)) {
        await restoreOrderStock(order, session);
      }

      deletedOrder = order.toObject();
      await order.deleteOne({ session });
    });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    logAudit("order_deleted", {
      orderId: id,
      userId: req.user?._id,
    });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    if ((error as Error)?.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Order not found" });
    }

    next(error);
  } finally {
    await session.endSession();
  }
};

export default {
  getAllOrders,
  getMyOrders,
  createOrder,
  updateOrder,
  deleteOrder,
};
