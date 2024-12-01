import { Request, Response, NextFunction } from "express";

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (user && user.role === "admin") {
    return next();
  }

  return res
    .status(403)
    .json({ message: "Access denied, admin role required." });
};
