import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const JWT_ISSUER = "new-pawnshop-backend";
const JWT_AUDIENCE = "new-pawnshop-front";

export type AccessTokenPayload = {
  id?: string;
  sub?: string;
  email?: string;
  type?: string;
};

export const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (value: unknown) => {
  const password = String(value || "");

  if (password.length < 8) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }

  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "Hasło musi zawierać litery i cyfry.";
  }

  return "";
};

export const createAccessToken = (user: { _id: unknown; email?: string }) =>
  jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      type: "access",
    },
    env.jwtSecret,
    {
      subject: String(user._id),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    }
  );

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.jwtSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as AccessTokenPayload;

export const getAccessTokenExpiresInSeconds = () => ACCESS_TOKEN_EXPIRES_IN_SECONDS;
