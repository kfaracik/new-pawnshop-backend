import { Router } from "express";
import locationController from "../controllers/locationController";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Locations
 *     description: Store and pickup locations
 */

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Get active locations
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Active locations ordered by sort order and name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get("/", locationController.getAllLocations);

export default router;
