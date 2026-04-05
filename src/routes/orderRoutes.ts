import { Router } from "express";
import orderController from "../controllers/orderController";
import { isAdmin } from "../middlewares/authAdmin";
import { authenticateUser, optionallyAuthenticateUser } from "../middlewares/authenticateUser";

const router = Router();

router.get("/", authenticateUser, isAdmin, orderController.getAllOrders);
router.get("/my", authenticateUser, orderController.getMyOrders);
router.post("/", optionallyAuthenticateUser, orderController.createOrder);
router.put("/:id", authenticateUser, isAdmin, orderController.updateOrder);
router.delete("/:id", authenticateUser, isAdmin, orderController.deleteOrder);

export default router;
