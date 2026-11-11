const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { customerOnly } = require("../middleware/roles");

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Customers' Orders, placed from their Cart
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an Order
 *     description: Customer only. Prices come from the stored Records, never from the request. Stock is checked and reduced in one synchronous write; if any line references a missing Record or exceeds its stock, the whole Order is rejected and nothing is reduced. Payment is simulated
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lines, shippingAddress]
 *             properties:
 *               lines:
 *                 type: array
 *                 description: One line per Record, each Record at most once
 *                 items:
 *                   type: object
 *                   required: [recordId, quantity]
 *                   properties:
 *                     recordId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               shippingAddress:
 *                 $ref: '#/components/schemas/ShippingAddressInput'
 *     responses:
 *       201:
 *         description: The placed Order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid lines or shipping address (address errors are listed per field)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a Customer (the Admin cannot place Orders)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Rejected; nothing was reduced
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: ORDER_REJECTED
 *                 message:
 *                   type: string
 *                 lines:
 *                   type: array
 *                   description: Each failing line
 *                   items:
 *                     type: object
 *                     properties:
 *                       recordId:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                         description: The quantity requested
 *                       reason:
 *                         type: string
 *                         enum: [missing, insufficientStock]
 *                       available:
 *                         type: integer
 *                         description: Copies in stock now (0 for a missing Record)
 */
router.post("/", customerOnly, orderController.placeOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get one of your Orders
 *     description: Customer only. Answers 404 for someone else's Order as for a missing one
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The Order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a Customer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No such Order among yours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", customerOnly, orderController.getOrderById);

module.exports = router;
