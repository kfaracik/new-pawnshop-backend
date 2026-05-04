import { Request, Response, NextFunction } from "express";
import { withDatabase } from "../utils/database";

const requireDatabase = async (_req: Request, res: Response, next: NextFunction) => {
  const connected = await withDatabase();

  if (!connected) {
    res.status(503).json({
      message: "Database temporarily unavailable",
    });
    return;
  }

  next();
};

export default requireDatabase;
