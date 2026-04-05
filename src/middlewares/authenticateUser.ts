import jwt from "jsonwebtoken";
import { User } from "../models/userModel";

const getTokenFromRequest = (req) =>
  req.header("Authorization")?.replace("Bearer ", "") || "";

const resolveUserFromToken = async (token: string) => {
  const serviceAdminToken = process.env.AUCTION_ADMIN_TOKEN;

  if (!token) return null;

  if (serviceAdminToken && token === serviceAdminToken) {
    return {
      _id: "service-admin",
      email: "service-admin@internal.local",
      isAdmin: true,
    };
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id?: string };
  if (!decoded?.id) return null;

  const user = await User.findById(decoded.id);
  return user || null;
};

export const authenticateUser = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const user = await resolveUserFromToken(token);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionallyAuthenticateUser = async (req, _res, next) => {
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
