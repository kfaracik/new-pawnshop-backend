import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logger";

type ApiError = Error & {
  statusCode?: number;
};

const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  logError("request_failed", {
    statusCode,
    message: err.message,
    stack: err.stack,
  });
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
};

export default errorHandler;
