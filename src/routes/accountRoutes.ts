import { Router } from "express";
import rateLimit from "express-rate-limit";
import accountController from "../controllers/accountController";
import { authenticateUser } from "../middlewares/authenticateUser";
import { env } from "../config/env";

const router = Router();

// Sensitive credential changes are rate-limited per IP.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticateUser);

router.get("/", accountController.getProfile);
router.put("/", accountController.updateProfile);
router.put("/password", sensitiveLimiter, accountController.changePassword);
router.put("/email", sensitiveLimiter, accountController.changeEmail);
router.delete("/", sensitiveLimiter, accountController.deleteAccount);

export default router;
