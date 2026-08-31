import { Router } from "express";
import rateLimit from "express-rate-limit";
import inquiryController from "../controllers/inquiryController";
import { isAdmin } from "../middlewares/authAdmin";
import { authenticateUser } from "../middlewares/authenticateUser";
import { validateBody } from "../middlewares/validate";
import { createInquirySchema, updateInquirySchema } from "../validation/inquirySchemas";

const router = Router();

// Public submissions are spam-prone: cap them per IP.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Zbyt wiele zgłoszeń. Spróbuj ponownie za kilka minut.",
  },
});

/**
 * @swagger
 * tags:
 *   - name: Inquiries
 *     description: Valuation requests, availability alerts and newsletter sign-ups
 */

/**
 * @swagger
 * /inquiries:
 *   post:
 *     summary: Submit an inquiry (valuation, loan, question, availability, newsletter)
 *     tags: [Inquiries]
 *     responses:
 *       201:
 *         description: Inquiry accepted
 *       400:
 *         description: Invalid payload
 *       429:
 *         description: Too many submissions
 *   get:
 *     summary: List inquiries (Admin only)
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inquiry list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.post(
  "/",
  submitLimiter,
  validateBody(createInquirySchema),
  inquiryController.createInquiry
);
router.get("/", authenticateUser, isAdmin, inquiryController.getAllInquiries);
router.put(
  "/:id",
  authenticateUser,
  isAdmin,
  validateBody(updateInquirySchema),
  inquiryController.updateInquiry
);
router.delete("/:id", authenticateUser, isAdmin, inquiryController.deleteInquiry);

export default router;
