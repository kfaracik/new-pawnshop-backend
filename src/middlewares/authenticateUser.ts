import jwt from "jsonwebtoken";
import { User } from "../models/userModel";

export const authenticateUser = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  const serviceAdminToken = process.env.AUCTION_ADMIN_TOKEN;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Allow trusted server-to-server admin calls (e.g. admin panel proxy).
  if (serviceAdminToken && token === serviceAdminToken) {
    req.user = {
      _id: "service-admin",
      email: "service-admin@internal.local",
      isAdmin: true,
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
