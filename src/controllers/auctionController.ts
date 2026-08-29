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
import { getSingleValue } from "../utils/request";
import { maskUserRef } from "../utils/mask";
import {
  emitAuctionBidUpdated,
  emitAuctionStatusChanged,
  initializeAuctionEventStream,
  isValidObjectId,
  toObjectId,
  validateAuctionPayload,
} from "../utils/auction";

const AUCTION_STATUSES = new Set(["scheduled", "live", "ended", "canceled"]);

const getAllAuctions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, productId } = req.query;
    const query: any = {};

    if (typeof status === "string" && AUCTION_STATUSES.has(status)) {
      query.status = status;
    }

    if (productId && isValidObjectId(String(productId))) {
      query.productId = productId;
    }

    const auctions = await Auction.find(query)
      .populate("productId")
      .populate("winnerUserId", "_id email")
      .sort({ startAt: -1 })
      .lean();

    res.status(200).json(
      auctions.map((auction: any) => ({
        ...auction,
        winnerUserId: maskUserRef(auction.winnerUserId),
      }))
    );
  } catch (error) {
    next(error);
  }
};

const getAuctionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const auction = await Auction.findById(id)
      .populate("productId")
      .populate("winnerUserId", "_id email")
      .lean();

    if (!auction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    res.status(200).json({
      ...auction,
      winnerUserId: maskUserRef((auction as any).winnerUserId),
    });
  } catch (error) {
    next(error);
  }
};

const getAuctionBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const bids = await Bid.find({ auctionId: id })
      .populate("userId", "_id email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(
      bids.map((bid: any) => ({ ...bid, userId: maskUserRef(bid.userId) }))
    );
  } catch (error) {
    next(error);
  }
};

const getMyAuctionParticipations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId || !isValidObjectId(String(userId))) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userBids = await Bid.find({ userId })
      .sort({ createdAt: -1 })
      .lean<any[]>();

    if (!userBids.length) {
      return res.status(200).json([]);
    }

    const auctionIds = [...new Set(userBids.map((bid) => String(bid.auctionId)))];
    const auctions = await Auction.find({ _id: { $in: auctionIds } })
      .populate("productId", "_id title images")
      .sort({ createdAt: -1 })
      .lean<any[]>();

    const highestBidByAuction = new Map<string, number>();
    for (const bid of userBids) {
      const auctionId = String(bid.auctionId);
      const previous = highestBidByAuction.get(auctionId) ?? 0;
      if (Number(bid.amount) > previous) {
        highestBidByAuction.set(auctionId, Number(bid.amount));
      }
    }

    const response = auctions.map((auction) => ({
      ...auction,
      myHighestBid: highestBidByAuction.get(String(auction._id)) ?? null,
    }));

    return res.status(200).json(response);
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
      return res.status(404).json({ message: "Nie znaleziono produktu." });
    }

    const alreadyExists = await Auction.findOne({ productId }).select("_id").lean();
    if (alreadyExists) {
      return res.status(409).json({ message: "Aukcja dla tego produktu już istnieje." });
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
    product.auctionLink = `/product/${productId}`;
    await product.save();

    const created = await Auction.findById(auction._id).populate("productId").lean();

    emitAuctionStatusChanged({
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
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    if (auction.status === "ended") {
      return res.status(409).json({ message: "Zakończonej aukcji nie można modyfikować." });
    }

    const { startAt, endAt, startPrice, minIncrement, status } = req.body;

    if (startAt) {
      const startDate = new Date(startAt);
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ message: "Nieprawidłowa data rozpoczęcia." });
      }
      auction.startAt = startDate;
    }

    if (endAt) {
      const endDate = new Date(endAt);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Nieprawidłowa data zakończenia." });
      }
      auction.endAt = endDate;
    }

    if (auction.endAt <= auction.startAt) {
      return res.status(400).json({ message: "Data zakończenia musi być późniejsza niż rozpoczęcia." });
    }

    if (startPrice !== undefined) {
      if (!Number.isFinite(Number(startPrice)) || Number(startPrice) < 0) {
        return res.status(400).json({ message: "Nieprawidłowa cena wywoławcza." });
      }

      const existingBids = await Bid.exists({ auctionId: id });
      if (existingBids) {
        return res.status(409).json({ message: "Nie można zmienić ceny wywoławczej po pierwszej ofercie." });
      }

      auction.startPrice = Number(startPrice);
      auction.currentPrice = Number(startPrice);
    }

    if (minIncrement !== undefined) {
      if (!Number.isFinite(Number(minIncrement)) || Number(minIncrement) <= 0) {
        return res.status(400).json({ message: "Nieprawidłowe minimalne przebicie." });
      }
      auction.minIncrement = Number(minIncrement);
    }

    if (status && ["scheduled", "live", "canceled"].includes(status)) {
      auction.status = status;
    } else {
      auction.status = calculateAuctionStatus(auction.startAt, auction.endAt) as any;
    }

    await auction.save();

    emitAuctionStatusChanged({
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
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const auction = await Auction.findByIdAndDelete(id);
    if (!auction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    await Bid.deleteMany({ auctionId: id });
    await Product.findByIdAndUpdate(auction.productId, {
      isAuction: false,
      auctionLink: null,
    });

    res.status(200).json({ message: "Aukcja została usunięta." });
  } catch (error) {
    next(error);
  }
};

const placeBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    const { amount } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Nieprawidłowa kwota oferty." });
    }

    const auction = await Auction.findById(id).lean<any>();
    if (!auction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    const now = new Date();
    if (auction.status !== "live" || now < new Date(auction.startAt) || now >= new Date(auction.endAt)) {
      return res.status(409).json({ message: "Aukcja nie jest aktywna." });
    }

    const minAllowed = Number(auction.currentPrice) + Number(auction.minIncrement);
    const normalizedAmount = Number(amount);

    if (normalizedAmount < minAllowed) {
      return res.status(409).json({
        message: `Oferta musi wynosić co najmniej ${minAllowed}.`,
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
      return res.status(409).json({ message: "Konflikt ofert. Spróbuj ponownie z aktualną ceną." });
    }

    const bid = await Bid.create({
      auctionId: id,
      userId,
      amount: normalizedAmount,
    });

    emitAuctionBidUpdated({
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
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const closedAuction = await manualCloseAuction(id);

    if (!closedAuction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    res.status(200).json(closedAuction);
  } catch (error) {
    next(error);
  }
};

// Cap concurrent SSE streams per client so an anonymous caller can't exhaust
// server sockets by opening unbounded long-lived connections.
const MAX_STREAMS_PER_IP = 5;
const activeStreamsByIp = new Map<string, number>();

const streamClientKey = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.socket?.remoteAddress || "unknown";
};

const streamAuctionEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Identyfikator aukcji jest wymagany." });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator aukcji." });
    }

    const clientKey = streamClientKey(req);
    const currentStreams = activeStreamsByIp.get(clientKey) || 0;
    if (currentStreams >= MAX_STREAMS_PER_IP) {
      return res.status(429).json({ message: "Too many open streams." });
    }

    const auction = await Auction.findById(id).lean<any>();
    if (!auction) {
      return res.status(404).json({ message: "Nie znaleziono aukcji." });
    }

    activeStreamsByIp.set(clientKey, currentStreams + 1);

    const { sendEvent } = initializeAuctionEventStream({
      res,
      auctionId: id,
      auction,
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
      const remaining = (activeStreamsByIp.get(clientKey) || 1) - 1;
      if (remaining <= 0) {
        activeStreamsByIp.delete(clientKey);
      } else {
        activeStreamsByIp.set(clientKey, remaining);
      }
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
  getMyAuctionParticipations,
  createAuction,
  updateAuction,
  deleteAuction,
  placeBid,
  closeAuction,
  streamAuctionEvents,
};
