import { Model, Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    favoriteCategories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const User: Model<any> = models.User || model("User", UserSchema);

export type IUser = {
  _id: string;
  email: string;
  password: string;
  favoriteCategories: string[];
  isAdmin: boolean;
};
