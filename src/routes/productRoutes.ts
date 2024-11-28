import { Router } from "express";
import productController from "../controllers/productController";

const router = Router();

router.get("/", productController.getAllProducts);
router.get("/new", productController.getNewProducts);
router.post("/", productController.createProduct);

export default router;