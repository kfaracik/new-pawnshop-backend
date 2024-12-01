import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/orderModel';

const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find().populate('userId').populate('products.productId');
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, products, totalAmount } = req.body;

    const newOrder = new Order({
      userId,
      products,
      totalAmount,
      status: 'pending',
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

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
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
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order deleted successfully' });
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
