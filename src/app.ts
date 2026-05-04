import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import errorHandler from "./middlewares/errorHandler";
import requestLogger from "./middlewares/requestLogger";
import orderRoutes from "./routes/orderRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import auctionRoutes from "./routes/auctionRoutes";
import { startAuctionScheduler } from "./services/auctionService";
import { startOrderReservationScheduler } from "./services/orderReservationService";
import { logWarn } from "./utils/logger";

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swaggerConfig");
const app: Application = express();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const isLocalOrigin = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isAllowedRenderPreviewOrigin = (origin: string) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
};

const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (env.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  if (env.corsAllowLocalhost && isLocalOrigin(origin)) {
    callback(null, true);
    return;
  }

  if (env.corsAllowRenderPreviews && isAllowedRenderPreviewOrigin(origin)) {
    callback(null, true);
    return;
  }

  logWarn("cors_origin_rejected", { origin });
  callback(null, false);
};

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

connectDB();
startAuctionScheduler();
startOrderReservationScheduler();

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", environment: env.nodeEnv });
});

app.use("/api/v1/products", productRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/auctions", auctionRoutes);

// Backward compatibility for existing clients.
app.use("/api/products", productRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/auctions", auctionRoutes);

app.use(errorHandler);

export default app;
