import { Router } from "express";
import { isAdmin } from "../middlewares/authAdmin";
import categoryController from "../controllers/categoryController";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Operations related to categories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Retrieve all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The category ID
 *         required: true
 *         schema:
 *           type: integer
 *       - name: category
 *         in: body
 *         description: The category data to update
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *     responses:
 *       200:
 *         description: The updated category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Category not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The category ID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The category was deleted
 *       404:
 *         description: Category not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

router.get("/", categoryController.getAllCategories);
router.post("/", isAdmin, categoryController.createCategory);
router.put("/:id", isAdmin, categoryController.updateCategory);
router.delete("/:id", isAdmin, categoryController.deleteCategory);

export default router;
