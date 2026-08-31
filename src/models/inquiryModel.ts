import { Model, Schema, model, models } from "mongoose";

export const INQUIRY_TYPES = [
  "valuation",
  "loan",
  "question",
  "availability",
  "newsletter",
] as const;

export const INQUIRY_STATUSES = ["new", "contacted", "closed"] as const;

const InquirySchema = new Schema(
  {
    type: {
      type: String,
      enum: INQUIRY_TYPES,
      required: true,
      default: "question",
      index: true,
    },
    // Newsletter sign-ups carry only an email; the rest are optional per type.
    name: { type: String, trim: true, maxlength: 120, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    message: { type: String, trim: true, maxlength: 4000, default: "" },
    itemCategory: { type: String, trim: true, maxlength: 120, default: "" },
    // "Powiadom o dostępności" ties the request to a product.
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    productTitle: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      required: true,
      default: "new",
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 2000, default: "" },
    source: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { timestamps: true, versionKey: false }
);

InquirySchema.index({ createdAt: -1 });
InquirySchema.index({ status: 1, createdAt: -1 });
// One newsletter subscription per address; other types may repeat freely.
InquirySchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { type: "newsletter" } }
);

export const Inquiry: Model<any> = models.Inquiry || model("Inquiry", InquirySchema);
