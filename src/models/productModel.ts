import mongoose, { model, Schema, models } from "mongoose";

const ProductSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be greater than or equal to 0"],
    },
    images: {
      type: [String],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "At least one image is required",
      },
    },
    category: {
      type: mongoose.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    properties: {
      type: Map,
      of: String,
    },
    isAuction: {
      type: Boolean,
      default: false,
    },
    auctionLink: {
      type: String,
      default: null,
      validate: {
        validator: function (value: string) {
          return this.isAuction ? !!value : true;
        },
        message: "Auction link is required for auction products",
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

export const Product = models.Product || model("Product", ProductSchema);
