import { Auction } from "../models/auctionModel";
import { Bid } from "../models/bidModel";
import { AUCTION_EVENT, auctionEvents } from "./auctionEvents";

const SCHEDULER_INTERVAL_MS = 5000;
let schedulerStarted = false;

export const calculateAuctionStatus = (startAt: Date, endAt: Date) => {
  const now = new Date();
  if (now < startAt) return "scheduled";
  if (now >= startAt && now < endAt) return "live";
  return "ended";
};

const finalizeAuctionWinner = async (auctionId: string) => {
  const highestBid = await Bid.findOne({ auctionId })
    .sort({ amount: -1, createdAt: 1 })
    .lean<any>();

  const updatePayload: any = {
    status: "ended",
    finalizedAt: new Date(),
  };

  if (highestBid) {
    updatePayload.winnerUserId = highestBid.userId;
    updatePayload.currentPrice = highestBid.amount;
  }

  const updatedAuction = await Auction.findByIdAndUpdate(auctionId, updatePayload, {
    new: true,
  }).lean<any>();

  if (updatedAuction) {
    auctionEvents.emit(AUCTION_EVENT.STATUS_CHANGED, {
      auctionId: String(updatedAuction._id),
      status: updatedAuction.status,
      currentPrice: updatedAuction.currentPrice,
      winnerUserId: updatedAuction.winnerUserId || null,
      endAt: updatedAuction.endAt,
    });
  }
};

export const manualCloseAuction = async (auctionId: string) => {
  const auction = await Auction.findByIdAndUpdate(
    auctionId,
    { status: "ended", closedByAdmin: true },
    { new: true }
  ).lean<any>();

  if (!auction) {
    return null;
  }

  await finalizeAuctionWinner(String(auction._id));
  return Auction.findById(auctionId).lean();
};

export const processAuctionsLifecycle = async () => {
  const now = new Date();

  const liveAuctions = await Auction.updateMany(
    { status: "scheduled", startAt: { $lte: now }, endAt: { $gt: now } },
    { status: "live" }
  );

  if (liveAuctions.modifiedCount > 0) {
    const updated = await Auction.find({ status: "live", startAt: { $lte: now }, endAt: { $gt: now } }).lean();
    updated.forEach((auction: any) => {
      auctionEvents.emit(AUCTION_EVENT.STATUS_CHANGED, {
        auctionId: String(auction._id),
        status: auction.status,
        currentPrice: auction.currentPrice,
        endAt: auction.endAt,
      });
    });
  }

  const auctionsToFinalize = await Auction.find({
    status: { $in: ["live", "scheduled"] },
    endAt: { $lte: now },
  })
    .select("_id")
    .lean<any[]>();

  for (const auction of auctionsToFinalize) {
    await finalizeAuctionWinner(String(auction._id));
  }
};

export const startAuctionScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  processAuctionsLifecycle().catch((error) => {
    console.error("Auction lifecycle bootstrap failed", error);
  });

  setInterval(() => {
    processAuctionsLifecycle().catch((error) => {
      console.error("Auction lifecycle tick failed", error);
    });
  }, SCHEDULER_INTERVAL_MS);
};
