import { Schema, model, models } from "mongoose";

const BidSchema = new Schema(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true, versionKey: false }
);

BidSchema.index({ auctionId: 1, createdAt: -1 });
BidSchema.index({ auctionId: 1, amount: -1, createdAt: 1 });

export const Bid = models.Bid || model("Bid", BidSchema);
