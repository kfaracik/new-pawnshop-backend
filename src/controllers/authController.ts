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

const AUTH_FAILED_MESSAGE = "Nieprawidłowy e-mail lub hasło.";
// Fixed valid bcrypt hash used only to equalize login timing when the account is absent.
const DUMMY_PASSWORD_HASH =
  "$2b$10$gBN4IDoAvA0kyi/AvSuKdOKgDAw7fNWncatMyMa9Wd40geKfTwbG.";

export const getUserData = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user?._id) {
    return res.status(401).json({ message: "Nie jesteś zalogowany." });
  }

  return res.json({
    id: user._id,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Podaj prawidłowy adres e-mail." });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "Konto z tym adresem e-mail już istnieje." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    const token = createAccessToken(user);

    res.status(201).json({
      message: "Konto zostało utworzone.",
      token,
      tokenType: "Bearer",
      expiresIn: getAccessTokenExpiresInSeconds(),
      user: {
        id: user._id,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Konto z tym adresem e-mail już istnieje." });
    }

    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email) || !password) {
      return res.status(401).json({ message: AUTH_FAILED_MESSAGE });
    }

    const user = await User.findOne({ email }).select(
      "+password email isAdmin tokenVersion"
    );

    if (!user) {
      // Equalize response time so a missing account is indistinguishable from a wrong password.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({ message: AUTH_FAILED_MESSAGE });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: AUTH_FAILED_MESSAGE });
    }

    const token = createAccessToken(user);

    res.status(200).json({
      message: "Zalogowano pomyślnie.",
      token,
      tokenType: "Bearer",
      expiresIn: getAccessTokenExpiresInSeconds(),
      user: {
        id: user._id,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (userId) {
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  }
  return res.status(200).json({ message: "Wylogowano pomyślnie." });
};

export default {
  getUserData,
  register,
  login,
  logout,
};
