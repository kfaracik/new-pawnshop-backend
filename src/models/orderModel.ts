import { Model, Schema, model, models } from "mongoose";

const OrderedProductSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    reservationStockField: {
      type: String,
      enum: ["quantity", "stock", "none"],
      default: "quantity",
    },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customer: {
      name: { type: String, required: true, trim: true },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      streetAddress: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    products: {
      type: [OrderedProductSchema],
      validate: {
        validator: (value: unknown[]) => Array.isArray(value) && value.length > 0,
        message: "At least one product is required",
      },
      required: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    subtotalAmount: { type: Number, required: true, min: 0 },
    deliveryPrice: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    deliveryMethod: {
      type: String,
      enum: ["courier_standard", "parcel_locker", "store_pickup"],
      required: true,
      default: "courier_standard",
    },
    deliveryEtaLabel: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "stripe_card"],
      required: true,
      default: "bank_transfer",
    },
    paymentProvider: {
      type: String,
      enum: ["manual", "stripe"],
      required: true,
      default: "manual",
    },
    paymentSessionStatus: {
      type: String,
      enum: ["not_started", "sandbox_ready", "requires_integration", "session_created"],
      required: true,
      default: "requires_integration",
    },
    orderStatus: {
      type: String,
      enum: ["pending_payment", "paid", "completed", "canceled", "failed"],
      default: "pending_payment",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "canceled", "refunded"],
      default: "unpaid",
    },
    paid: { type: Boolean, default: false },
    reservationExpiresAt: { type: Date, default: null },
    paymentNotes: { type: String, default: "" },
    paymentSessionId: { type: String, default: null },
  },
  { timestamps: true }
);

export const Order: Model<any> = models.Order || model("Order", OrderSchema);
