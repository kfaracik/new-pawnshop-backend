type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  corsOrigins: string[];
  auctionAdminToken?: string;
};

const parseCorsOrigins = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  mongoUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  auctionAdminToken: process.env.AUCTION_ADMIN_TOKEN,
};
