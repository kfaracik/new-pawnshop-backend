import { Router } from "express";
import authController from "../controllers/authController";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();

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
 *                 name:
 *                   type: string
 *                   description: User's name
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
 *                   description: JWT token for authentication
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
 *                   description: JWT token for authentication
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */


router.get("/user", authenticateUser, authController.getUserData);
router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
