import { Router } from "express";
import auctionController from "../controllers/auctionController";
import { authenticateUser } from "../middlewares/authenticateUser";
import { isAdmin } from "../middlewares/authAdmin";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auctions
 *     description: Auction management and bidding
 */

/**
 * @swagger
 * /auctions:
 *   get:
 *     summary: Get all auctions
 *     tags: [Auctions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, live, ended, canceled]
 *         description: Filter by auction status
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product id
 *     responses:
 *       200:
 *         description: Auctions list
 *   post:
 *     summary: Create auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, startAt, endAt, startPrice, minIncrement]
 *             properties:
 *               productId:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               startPrice:
 *                 type: number
 *               minIncrement:
 *                 type: number
 *     responses:
 *       201:
 *         description: Auction created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Auction for product already exists
 */

/**
 * @swagger
 * /auctions/{id}:
 *   get:
 *     summary: Get auction details
 *     tags: [Auctions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction details
 *       404:
 *         description: Auction not found
 *   put:
 *     summary: Update auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               startPrice:
 *                 type: number
 *               minIncrement:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [scheduled, live, canceled]
 *     responses:
 *       200:
 *         description: Auction updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Auction not found
 *       409:
 *         description: Conflict (e.g. ended auction or invalid state change)
 *   delete:
 *     summary: Delete auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Auction not found
 */

/**
 * @swagger
 * /auctions/{id}/bids:
 *   get:
 *     summary: Get bids history for auction
 *     tags: [Auctions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bids list
 *   post:
 *     summary: Place a bid
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid accepted
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Auction inactive or bid too low/conflict
 */

/**
 * @swagger
 * /auctions/{id}/close:
 *   post:
 *     summary: Manually close auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction closed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Auction not found
 */

/**
 * @swagger
 * /auctions/{id}/stream:
 *   get:
 *     summary: Stream live auction updates (SSE)
 *     tags: [Auctions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SSE stream with events connected, bid_updated, status_changed, ping
 */

router.get("/", auctionController.getAllAuctions);
router.get(
  "/my/participations",
  authenticateUser,
  auctionController.getMyAuctionParticipations
);
router.get("/:id", auctionController.getAuctionById);
router.get("/:id/bids", auctionController.getAuctionBids);
router.get("/:id/stream", auctionController.streamAuctionEvents);

router.post("/", authenticateUser, isAdmin, auctionController.createAuction);
router.put("/:id", authenticateUser, isAdmin, auctionController.updateAuction);
router.delete("/:id", authenticateUser, isAdmin, auctionController.deleteAuction);
router.post("/:id/close", authenticateUser, isAdmin, auctionController.closeAuction);

router.post("/:id/bids", authenticateUser, auctionController.placeBid);

export default router;
