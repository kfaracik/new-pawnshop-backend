import { Router } from "express";
import orderController from "../controllers/orderController";
import { isAdmin } from "../middlewares/authAdmin";

const router = Router();

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Retrieve all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: The page number for pagination.
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: The number of orders per page.
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A list of orders
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
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       userId:
 *                         type: string
 *                       products:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             productId:
 *                               type: string
 *                             quantity:
 *                               type: integer
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: string
 *                         enum: ['pending', 'completed', 'canceled']
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new order (Authenticated users)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               totalAmount:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Bad request (missing fields or invalid data)
 *       500:
 *         description: Internal server error
 * /orders/{id}:
 *   put:
 *     summary: Update an order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the order to update.
 *         required: true
 *         schema:
 *           type: integer
 *       - name: order
 *         in: body
 *         description: The data to update the order (e.g., status).
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['pending', 'completed', 'canceled']
 *     responses:
 *       200:
 *         description: The updated order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete an order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the order to delete.
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The order was deleted
 *       404:
 *         description: Order not found
 *       403:
 *         description: Forbidden, only admins allowed
 *       500:
 *         description: Internal server error
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: string
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *         totalAmount:
 *           type: number
 *           format: float
 *         status:
 *           type: string
 *           enum: ['pending', 'completed', 'canceled']
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

router.get("/", isAdmin, orderController.getAllOrders);
router.post("/", orderController.createOrder);
router.put("/:id", isAdmin, orderController.updateOrder);
router.delete("/:id", isAdmin, orderController.deleteOrder);

export default router;
