import { Response } from "express";
import { Types } from "mongoose";
import { AUCTION_EVENT, auctionEvents } from "../services/auctionEvents";

export const toObjectId = (id: string) => new Types.ObjectId(id);

export const isValidObjectId = (value: string) => Types.ObjectId.isValid(value);

export const validateAuctionPayload = (body: {
  productId?: string;
  startAt?: string;
  endAt?: string;
  startPrice?: number | string;
  minIncrement?: number | string;
}) => {
  const { productId, startAt, endAt, startPrice, minIncrement } = body;

  if (!productId || !isValidObjectId(productId)) {
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

export const emitAuctionStatusChanged = (payload: {
  auctionId: string;
  status: string;
  currentPrice: number;
  endAt: Date;
}) => {
  auctionEvents.emit(AUCTION_EVENT.STATUS_CHANGED, payload);
};

export const emitAuctionBidUpdated = (payload: {
  auctionId: string;
  currentPrice: number;
  minIncrement: number;
  bidAmount: number;
  bidId: string;
  bidUserId: string;
  endAt: Date;
  happenedAt: string;
}) => {
  auctionEvents.emit(AUCTION_EVENT.BID_UPDATED, payload);
};

export const initializeAuctionEventStream = ({
  res,
  auctionId,
  auction,
}: {
  res: Response;
  auctionId: string;
  auction: {
    status: string;
    currentPrice: number;
    minIncrement: number;
    endAt: Date;
  };
}) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (eventName: string, payload: unknown) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent("connected", {
    auctionId,
    status: auction.status,
    currentPrice: auction.currentPrice,
    minIncrement: auction.minIncrement,
    endAt: auction.endAt,
  });

  return { sendEvent };
};
