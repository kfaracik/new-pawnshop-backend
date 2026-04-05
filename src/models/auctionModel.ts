import { Schema, model, models } from "mongoose";

const AuctionSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    startPrice: { type: Number, required: true, min: 0 },
    currentPrice: { type: Number, required: true, min: 0 },
    minIncrement: { type: Number, required: true, min: 0.01, default: 1 },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "canceled"],
      default: "scheduled",
    },
    winnerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finalizedAt: { type: Date, default: null },
    closedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

AuctionSchema.index({ status: 1, startAt: 1, endAt: 1 });
AuctionSchema.index({ endAt: 1 });

export const Auction = models.Auction || model("Auction", AuctionSchema);
