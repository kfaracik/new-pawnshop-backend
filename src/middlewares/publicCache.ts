import { Request, Response, NextFunction } from "express";

export const publicCache =
  (sMaxAge = 60, staleWhileRevalidate = 300) =>
  (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Cache-Control",
      `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    next();
  };
