import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";

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

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
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
    const dbProducts = await Product.find({ _id: { $in: uniqueProductIds } })
      .select("_id title price")
      .lean<any[]>();

    const productsById = new Map(dbProducts.map((p) => [String(p._id), p]));

    const orderProducts = normalizedProducts.map((item: any) => {
      const dbProduct = productsById.get(item.productId);
      if (!dbProduct) return null;

      return {
        productId: dbProduct._id,
        name: dbProduct.title,
        price: Number(dbProduct.price),
        quantity: item.quantity,
      };
    });

    if (orderProducts.some((item: any) => !item)) {
      return res.status(404).json({ message: "One or more ordered products were not found" });
    }

    const totalAmount = orderProducts.reduce(
      (sum: number, item: any) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    const newOrder = new Order({
      userId: req.user?._id || null,
      customer: { name, email, city, postalCode, streetAddress, country },
      products: orderProducts,
      totalAmount,
      status: "pending",
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });

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
  createOrder,
  updateOrder,
  deleteOrder,
};
