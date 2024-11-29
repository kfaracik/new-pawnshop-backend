import express, { Application } from "express";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import { connectDB } from "./config/db";
import errorHandler from "./middlewares/errorHandler";
import bcrypt from "bcrypt";

const cors = require("cors");

const app: Application = express();

app.use(express.json());

connectDB();

app.use(cors({}));

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

export default app;
