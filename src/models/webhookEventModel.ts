import { Model, Schema, model, models } from "mongoose";

const WebhookEventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const WebhookEvent: Model<any> =
  models.WebhookEvent || model("WebhookEvent", WebhookEventSchema);
