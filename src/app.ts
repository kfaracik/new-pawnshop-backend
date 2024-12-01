import express, { Application } from "express";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import { connectDB } from "./config/db";
import errorHandler from "./middlewares/errorHandler";
import orderRoutes from "./routes/orderRoutes";

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../swaggerConfig");
const cors = require("cors");
const app: Application = express();

app.use(express.json());

connectDB();

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  cors({
    // origin: "http://localhost:8888",
    // credentials: true,
  })
); // TODO: configure policy

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/order", orderRoutes);

app.use(errorHandler);

export default app;
