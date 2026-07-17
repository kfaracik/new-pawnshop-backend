import { Router } from "express";
import rateLimit from "express-rate-limit";
import authController from "../controllers/authController";
import { authenticateUser } from "../middlewares/authenticateUser";
import { env } from "../config/env";

const router = Router();

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API for user authentication and data retrieval
 */

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get authenticated user's data
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: User's unique ID
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 isAdmin:
 *                   type: boolean
 *                   description: Whether user has admin privileges
 *       401:
 *         description: Unauthorized, token missing or invalid
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 token:
 *                   type: string
 *                   description: JWT access token for Authorization Bearer header
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *                 expiresIn:
 *                   type: number
 *                   description: Access token lifetime in seconds
 *       400:
 *         description: Email is already in use
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   description: JWT access token for Authorization Bearer header
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *                 expiresIn:
 *                   type: number
 *                   description: Access token lifetime in seconds
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout accepted; client should remove JWT
 *       401:
 *         description: Unauthorized, token missing or invalid
 */


router.get("/user", authenticateUser, authController.getUserData);
router.post("/register", credentialsLimiter, authController.register);
router.post("/login", credentialsLimiter, authController.login);
router.post("/logout", authenticateUser, authController.logout);

export default router;
