import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/userModel";
import {
  createAccessToken,
  getAccessTokenExpiresInSeconds,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "../utils/auth";

const cleanString = (value: unknown, maxLength = 200) =>
  String(value ?? "").trim().slice(0, maxLength);

const toProfile = (user: any) => ({
  id: String(user._id),
  email: user.email,
  name: user.name || "",
  phone: user.phone || "",
  address: {
    streetAddress: user.address?.streetAddress || "",
    city: user.address?.city || "",
    postalCode: user.address?.postalCode || "",
    country: user.address?.country || "",
  },
  isAdmin: Boolean(user.isAdmin),
});

const requireUserId = (req: Request, res: Response) => {
  const id = req.user?._id;
  if (!id) {
    res.status(401).json({ message: "Nie jesteś zalogowany." });
    return null;
  }
  return String(id);
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono konta." });
    }

    return res.json(toProfile(user));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const body = req.body || {};
    const update = {
      name: cleanString(body.name, 120),
      phone: cleanString(body.phone, 40),
      address: {
        streetAddress: cleanString(body.address?.streetAddress, 200),
        city: cleanString(body.address?.city, 120),
        postalCode: cleanString(body.address?.postalCode, 20),
        country: cleanString(body.address?.country, 80),
      },
    };

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono konta." });
    }

    return res.json(toProfile(user));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(userId).select(
      "+password email tokenVersion"
    );
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono konta." });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Aktualne hasło jest nieprawidłowe." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    // The old token is now invalid (tokenVersion bumped) — issue a fresh one so
    // the current device stays signed in; every other device is logged out.
    const token = createAccessToken(user);
    return res.json({
      message: "Hasło zostało zmienione.",
      token,
      tokenType: "Bearer",
      expiresIn: getAccessTokenExpiresInSeconds(),
    });
  } catch (error) {
    next(error);
  }
};

export const changeEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const newEmail = normalizeEmail(req.body?.newEmail);
    const currentPassword = String(req.body?.currentPassword || "");

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({ message: "Podaj prawidłowy adres e-mail." });
    }

    const user = await User.findById(userId).select(
      "+password email tokenVersion"
    );
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono konta." });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Hasło jest nieprawidłowe." });
    }

    if (newEmail === user.email) {
      return res.status(400).json({ message: "To jest już Twój aktualny adres e-mail." });
    }

    const existing = await User.findOne({ email: newEmail }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "Ten adres e-mail jest już zajęty." });
    }

    user.email = newEmail;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    const token = createAccessToken(user);
    return res.json({
      message: "Adres e-mail został zmieniony.",
      token,
      tokenType: "Bearer",
      expiresIn: getAccessTokenExpiresInSeconds(),
      user: { id: String(user._id), email: user.email },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Ten adres e-mail jest już zajęty." });
    }
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const currentPassword = String(req.body?.currentPassword || "");

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono konta." });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Hasło jest nieprawidłowe." });
    }

    await User.deleteOne({ _id: userId });
    return res.json({ message: "Konto zostało usunięte." });
  } catch (error) {
    next(error);
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword,
  changeEmail,
  deleteAccount,
};
