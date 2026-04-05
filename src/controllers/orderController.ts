import { Request, Response, NextFunction } from "express";
import { Order } from "../models/orderModel";

const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find().populate("userId");
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { products, totalAmount } = req.body;
    const authenticatedUserId = req.user?._id;

    if (!authenticatedUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newOrder = new Order({
      userId: authenticatedUserId,
      products,
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
