import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { User } from "../models/userModel";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/auth";

const getTokenFromRequest = (req: Request) =>
  req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";

const safeEqual = (a: string, b: string) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
};

const resolveUserFromToken = async (token: string) => {
  const serviceAdminToken = env.auctionAdminToken;

  if (!token) return null;

  if (serviceAdminToken && safeEqual(token, serviceAdminToken)) {
    return {
      _id: "service-admin",
      email: "service-admin@internal.local",
      isAdmin: true,
    };
  }

  const decoded = verifyAccessToken(token);
  const userId = decoded.sub || decoded.id;
  if (!userId || decoded.type !== "access") return null;

  const user = await User.findById(userId).select("_id email isAdmin tokenVersion");
  if (!user) return null;

  if (Number(user.tokenVersion || 0) !== Number(decoded.tv || 0)) {
    return null;
  }

  return user;
};

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Nie jesteś zalogowany." });
  }

  try {
    const user = await resolveUserFromToken(token);

    if (!user) {
      return res.status(401).json({ message: "Sesja wygasła. Zaloguj się ponownie." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesja wygasła. Zaloguj się ponownie." });
  }
};

export const optionallyAuthenticateUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const user = await resolveUserFromToken(token);
    req.user = user || undefined;
  } catch (_error) {
    req.user = undefined;
  }

  return next();
};
