import type { NextFunction, Request, Response } from "express";
import { logInfo } from "../utils/logger";

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logInfo("http_request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?._id,
      ip: req.ip,
    });
  });

  next();
};

export default requestLogger;
