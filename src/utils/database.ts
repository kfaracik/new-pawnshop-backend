import { ensureDBConnection, isDatabaseReady } from "../config/db";

export const withDatabase = async () => {
  if (isDatabaseReady()) {
    return true;
  }

  return ensureDBConnection();
};
