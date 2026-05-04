import mongoose from "mongoose";
import { env } from "./env";
import { logError, logInfo, logWarn } from "../utils/logger";

let isConnecting = false;
let hasLoggedDisconnectedState = false;

mongoose.set("bufferCommands", false);

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

export const connectDB = async () => {
  if (isDatabaseReady() || isConnecting) {
    return isDatabaseReady();
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logInfo("mongodb_connected", { host: conn.connection.host });
    hasLoggedDisconnectedState = false;
    return true;
  } catch (error) {
    logError("mongodb_connection_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    isConnecting = false;
  }
};

export const ensureDBConnection = async () => {
  if (isDatabaseReady()) {
    hasLoggedDisconnectedState = false;
    return true;
  }

  if (!hasLoggedDisconnectedState) {
    logWarn("mongodb_not_ready_retrying_connection");
    hasLoggedDisconnectedState = true;
  }
  return connectDB();
};
