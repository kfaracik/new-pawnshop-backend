import { EventEmitter } from "events";

export const auctionEvents = new EventEmitter();

export const AUCTION_EVENT = {
  BID_UPDATED: "auction.bid.updated",
  STATUS_CHANGED: "auction.status.changed",
} as const;
