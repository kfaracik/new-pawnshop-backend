import express, { Application } from "express";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import { connectDB } from "./config/db";
import errorHandler from "./middlewares/errorHandler";
import orderRoutes from "./routes/orderRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import auctionRoutes from "./routes/auctionRoutes";
import { startAuctionScheduler } from "./services/auctionService";

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swaggerConfig");
const cors = require("cors");
const app: Application = express();

app.use(express.json());

connectDB();
startAuctionScheduler();

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  cors({
    // origin: "http://localhost:8888",
    // credentials: true,
  })
); // TODO: configure policy

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1/products", productRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/auctions", auctionRoutes);

// Backward compatibility for existing clients.
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/auctions", auctionRoutes);

app.use(errorHandler);

export default app;
