import { Router } from "express";
import productController from "../controllers/productController";
import { isAdmin } from "../middlewares/authAdmin";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Operations related to products
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Retrieve all products
 *     tags: [Products]
 *     parameters:
 *       - name: page
 *         in: query
 *         description: The page number
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: The number of items per page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/new:
 *   get:
 *     summary: Retrieve the latest products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of the latest products
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
 *                   price:
 *                     type: number
 *                     format: float
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/search:
 *   get:
 *     summary: Search for products by query
 *     tags: [Products]
 *     parameters:
 *       - name: query
 *         in: query
 *         description: Search query for the product title
 *         required: true
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description: The page number
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: The number of items per page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A list of search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
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
 *               price:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: The created product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                   format: float
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The product ID
 *         required: true
 *         schema:
 *           type: integer
 *       - name: product
 *         in: body
 *         description: The product data to update
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *               format: float
 *     responses:
 *       200:
 *         description: The updated product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                   format: float
 *       404:
 *         description: Product not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The product ID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The product was deleted
 *       404:
 *         description: Product not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 */

router.get("/", productController.getAllProducts);
router.get("/new", productController.getNewProducts);
router.get("/search", productController.searchProducts);
router.post("/", isAdmin, productController.createProduct);
router.put("/:id", isAdmin, productController.updateProduct);
router.delete("/:id", isAdmin, productController.deleteProduct);

export default router;
