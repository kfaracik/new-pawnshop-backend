type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  corsOrigins: string[];
  corsAllowRenderPreviews: boolean;
  corsAllowLocalhost: boolean;
  enableApiDocs: boolean;
  auctionAdminToken?: string;
};

const parseCorsOrigins = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const parseBoolean = (value: string | undefined, defaultValue = false) => {
  if (value == null || value.trim() === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

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
  corsAllowRenderPreviews: parseBoolean(process.env.CORS_ALLOW_RENDER_PREVIEWS, process.env.NODE_ENV !== "production"),
  corsAllowLocalhost: parseBoolean(process.env.CORS_ALLOW_LOCALHOST, process.env.NODE_ENV !== "production"),
  enableApiDocs: parseBoolean(process.env.ENABLE_API_DOCS, process.env.NODE_ENV !== "production"),
  auctionAdminToken: process.env.AUCTION_ADMIN_TOKEN,
};
