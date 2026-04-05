import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Auction } from "../models/auctionModel";
import { Bid } from "../models/bidModel";
import { Product } from "../models/productModel";
import { AUCTION_EVENT, auctionEvents } from "../services/auctionEvents";
import {
  calculateAuctionStatus,
  manualCloseAuction,
} from "../services/auctionService";

const toObjectId = (id: string) => new Types.ObjectId(id);

const validateAuctionPayload = (body: any) => {
  const { productId, startAt, endAt, startPrice, minIncrement } = body;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    return "Invalid productId";
  }

  if (!startAt || !endAt) {
    return "startAt and endAt are required";
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid startAt or endAt";
  }

  if (end <= start) {
    return "endAt must be later than startAt";
  }

  if (!Number.isFinite(Number(startPrice)) || Number(startPrice) < 0) {
    return "Invalid startPrice";
  }

  if (!Number.isFinite(Number(minIncrement)) || Number(minIncrement) <= 0) {
    return "Invalid minIncrement";
  }

  return null;
};

const getAllAuctions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, productId } = req.query;
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (productId && Types.ObjectId.isValid(String(productId))) {
      query.productId = productId;
    }

    const auctions = await Auction.find(query)
      .populate("productId")
      .populate("winnerUserId", "_id email")
      .sort({ startAt: -1 })
      .lean();

    res.status(200).json(auctions);
  } catch (error) {
    next(error);
  }
};

const getAuctionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const auction = await Auction.findById(id)
      .populate("productId")
      .populate("winnerUserId", "_id email")
      .lean();

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    res.status(200).json(auction);
  } catch (error) {
    next(error);
  }
};

const getAuctionBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const bids = await Bid.find({ auctionId: id })
      .populate("userId", "_id email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(bids);
  } catch (error) {
    next(error);
  }
};

const createAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationError = validateAuctionPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { productId, startAt, endAt, startPrice, minIncrement } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyExists = await Auction.findOne({ productId }).select("_id").lean();
    if (alreadyExists) {
      return res.status(409).json({ message: "Auction for this product already exists" });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const auction = await Auction.create({
      productId,
      startAt: startDate,
      endAt: endDate,
      startPrice: Number(startPrice),
      currentPrice: Number(startPrice),
      minIncrement: Number(minIncrement),
      status: calculateAuctionStatus(startDate, endDate),
    });

    product.isAuction = true;
    product.auctionLink = `/auctions/${auction._id}`;
    await product.save();

    const created = await Auction.findById(auction._id).populate("productId").lean();

    auctionEvents.emit(AUCTION_EVENT.STATUS_CHANGED, {
      auctionId: String(auction._id),
      status: auction.status,
      currentPrice: auction.currentPrice,
      endAt: auction.endAt,
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

const updateAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    if (auction.status === "ended") {
      return res.status(409).json({ message: "Ended auction cannot be modified" });
    }

    const { startAt, endAt, startPrice, minIncrement, status } = req.body;

    if (startAt) {
      const startDate = new Date(startAt);
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ message: "Invalid startAt" });
      }
      auction.startAt = startDate;
    }

    if (endAt) {
      const endDate = new Date(endAt);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid endAt" });
      }
      auction.endAt = endDate;
    }

    if (auction.endAt <= auction.startAt) {
      return res.status(400).json({ message: "endAt must be later than startAt" });
    }

    if (startPrice !== undefined) {
      if (!Number.isFinite(Number(startPrice)) || Number(startPrice) < 0) {
        return res.status(400).json({ message: "Invalid startPrice" });
      }

      const existingBids = await Bid.exists({ auctionId: id });
      if (existingBids) {
        return res.status(409).json({ message: "Cannot change startPrice after first bid" });
      }

      auction.startPrice = Number(startPrice);
      auction.currentPrice = Number(startPrice);
    }

    if (minIncrement !== undefined) {
      if (!Number.isFinite(Number(minIncrement)) || Number(minIncrement) <= 0) {
        return res.status(400).json({ message: "Invalid minIncrement" });
      }
      auction.minIncrement = Number(minIncrement);
    }

    if (status && ["scheduled", "live", "canceled"].includes(status)) {
      auction.status = status;
    } else {
      auction.status = calculateAuctionStatus(auction.startAt, auction.endAt) as any;
    }

    await auction.save();

    auctionEvents.emit(AUCTION_EVENT.STATUS_CHANGED, {
      auctionId: String(auction._id),
      status: auction.status,
      currentPrice: auction.currentPrice,
      endAt: auction.endAt,
    });

    res.status(200).json(auction);
  } catch (error) {
    next(error);
  }
};

const deleteAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const auction = await Auction.findByIdAndDelete(id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    await Bid.deleteMany({ auctionId: id });
    await Product.findByIdAndUpdate(auction.productId, {
      isAuction: false,
      auctionLink: null,
    });

    res.status(200).json({ message: "Auction deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const placeBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid bid amount" });
    }

    const auction = await Auction.findById(id).lean<any>();
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    const now = new Date();
    if (auction.status !== "live" || now < new Date(auction.startAt) || now >= new Date(auction.endAt)) {
      return res.status(409).json({ message: "Auction is not active" });
    }

    const minAllowed = Number(auction.currentPrice) + Number(auction.minIncrement);
    const normalizedAmount = Number(amount);

    if (normalizedAmount < minAllowed) {
      return res.status(409).json({
        message: `Bid must be at least ${minAllowed}`,
        minAllowed,
      });
    }

    const updatedAuction = await Auction.findOneAndUpdate(
      {
        _id: toObjectId(id),
        status: "live",
        endAt: { $gt: now },
        currentPrice: auction.currentPrice,
      },
      { currentPrice: normalizedAmount },
      { new: true }
    ).lean<any>();

    if (!updatedAuction) {
      return res.status(409).json({ message: "Bid conflict. Please retry with latest price." });
    }

    const bid = await Bid.create({
      auctionId: id,
      userId,
      amount: normalizedAmount,
    });

    auctionEvents.emit(AUCTION_EVENT.BID_UPDATED, {
      auctionId: id,
      currentPrice: updatedAuction.currentPrice,
      minIncrement: updatedAuction.minIncrement,
      bidAmount: bid.amount,
      bidId: bid._id,
      bidUserId: userId,
      endAt: updatedAuction.endAt,
      happenedAt: new Date().toISOString(),
    });

    res.status(201).json({
      bid,
      auction: {
        _id: updatedAuction._id,
        currentPrice: updatedAuction.currentPrice,
        minIncrement: updatedAuction.minIncrement,
        status: updatedAuction.status,
        endAt: updatedAuction.endAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const closeAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const closedAuction = await manualCloseAuction(id);

    if (!closedAuction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    res.status(200).json(closedAuction);
  } catch (error) {
    next(error);
  }
};

const streamAuctionEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    const auction = await Auction.findById(id).lean<any>();
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (eventName: string, payload: any) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent("connected", {
      auctionId: id,
      status: auction.status,
      currentPrice: auction.currentPrice,
      minIncrement: auction.minIncrement,
      endAt: auction.endAt,
    });

    const onBidUpdated = (payload: any) => {
      if (payload.auctionId === id) {
        sendEvent("bid_updated", payload);
      }
    };

    const onStatusChanged = (payload: any) => {
      if (payload.auctionId === id) {
        sendEvent("status_changed", payload);
      }
    };

    auctionEvents.on(AUCTION_EVENT.BID_UPDATED, onBidUpdated);
    auctionEvents.on(AUCTION_EVENT.STATUS_CHANGED, onStatusChanged);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: {"ok":true}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      auctionEvents.off(AUCTION_EVENT.BID_UPDATED, onBidUpdated);
      auctionEvents.off(AUCTION_EVENT.STATUS_CHANGED, onStatusChanged);
      res.end();
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllAuctions,
  getAuctionById,
  getAuctionBids,
  createAuction,
  updateAuction,
  deleteAuction,
  placeBid,
  closeAuction,
  streamAuctionEvents,
};
