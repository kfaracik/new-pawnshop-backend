import mongoose from "mongoose";
import { env } from "./env";
import { logError, logInfo } from "../utils/logger";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    logInfo("mongodb_connected", { host: conn.connection.host });
  } catch (error) {
    logError("mongodb_connection_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};
