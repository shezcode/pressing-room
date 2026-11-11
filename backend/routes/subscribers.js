const express = require("express");
const router = express.Router();
const subscriberController = require("../controllers/subscriberController");

/**
 * @swagger
 * tags:
 *   - name: Subscribers
 *     description: Signups to the Friday List
 */

/**
 * @swagger
 * /api/subscribers:
 *   post:
 *     summary: Sign up to the Friday List
 *     description: Public. Stores the email with the date subscribed. Nothing is sent. An email already on the list is rejected with 409 and code ALREADY_SUBSCRIBED
 *     tags: [Subscribers]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             example:
 *               email: "fan@example.com"
 *     responses:
 *       201:
 *         description: The new Subscriber
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Missing or malformed email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: The email is already a Subscriber
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: ALREADY_SUBSCRIBED
 *                 message:
 *                   type: string
 */
router.post("/", subscriberController.subscribe);

module.exports = router;
