import express, { Application } from "express";
import productRoutes from "./routes/productRoutes";
import { connectDB } from "./config/db";
import errorHandler from "./middlewares/errorHandler";

const app: Application = express();

app.use(express.json());

connectDB();

app.use("/api/products", productRoutes);

app.use(errorHandler);

export default app;
