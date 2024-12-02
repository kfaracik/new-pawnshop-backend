import { Request, Response, NextFunction } from "express";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user || user.isAdmin) {
    return res.status(403).json({ message: "Forbidden, only admins allowed" });
  }

  next();
};
