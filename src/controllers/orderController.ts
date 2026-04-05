import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";
import { getReservationExpiresAt } from "../services/orderReservationService";

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

    if (!name || !email || !city || !postalCode || !streetAddress || !country) {
      return res.status(400).json({ message: "Missing customer details" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Order must include at least one product" });
    }

    const normalizedProducts = products.map((item: any) => ({
      productId: String(item?.productId || ""),
      quantity: Number(item?.quantity || 0),
    }));

    const hasInvalidItem = normalizedProducts.some(
      (item: any) => !Types.ObjectId.isValid(item.productId) || !Number.isFinite(item.quantity) || item.quantity < 1
    );

    if (hasInvalidItem) {
      return res.status(400).json({ message: "Invalid order products payload" });
    }

    const uniqueProductIds = [...new Set(normalizedProducts.map((item: any) => item.productId))];
    let createdOrder: any = null;

    await session.withTransaction(async () => {
      const dbProducts = await Product.find({ _id: { $in: uniqueProductIds } })
        .select("_id title price quantity")
        .session(session)
        .lean<any[]>();

      const productsById = new Map(dbProducts.map((p) => [String(p._id), p]));
      const orderProducts: Array<{ productId: any; name: string; price: number; quantity: number }> = [];

      for (const item of normalizedProducts) {
        const dbProduct = productsById.get(item.productId);

        if (!dbProduct) {
          unavailableProducts.push(item.productId);
          continue;
        }

        const availableQuantity = Number(dbProduct.quantity);
        if (!Number.isFinite(availableQuantity) || availableQuantity < item.quantity) {
          unavailableProducts.push(String(dbProduct._id));
          continue;
        }

        const updated = await Product.findOneAndUpdate(
          {
            _id: new Types.ObjectId(item.productId),
            quantity: { $gte: item.quantity },
          },
          {
            $inc: { quantity: -item.quantity },
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

        orderProducts.push({
          productId: dbProduct._id,
          name: dbProduct.title,
          price: Number(dbProduct.price),
          quantity: item.quantity,
        });
      }

      if (unavailableProducts.length > 0) {
        throw new Error("ORDER_UNAVAILABLE_PRODUCTS");
      }

      const totalAmount = orderProducts.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0
      );

      const [newOrder] = await Order.create(
        [
          {
            userId: req.user?._id && Types.ObjectId.isValid(String(req.user._id)) ? req.user._id : null,
            customer: {
              name,
              email: String(email).toLowerCase(),
              city,
              postalCode,
              streetAddress,
              country,
            },
            products: orderProducts,
            totalAmount,
            orderStatus: "pending_payment",
            paymentStatus: "unpaid",
            paid: false,
            reservationExpiresAt: getReservationExpiresAt(),
          },
        ],
        { session }
      );

      createdOrder = newOrder;
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
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, paid } = req.body || {};

    const update: Record<string, unknown> = {};
    if (orderStatus) update.orderStatus = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (typeof paid === "boolean") update.paid = paid;

    const order = await Order.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllOrders,
  getMyOrders,
  createOrder,
  updateOrder,
  deleteOrder,
};
