import { Router } from "express";
import authController from "../controllers/authController";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();

router.get("/user", authenticateUser, authController.getUserData);
router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
