const express = require("express");
const router = express.Router();
const config = require("../lib/config");
const { listCovers } = require("../lib/coverUpload");

/**
 * @swagger
 * tags:
 *   - name: Demo
 *     description: The public portfolio Demo
 */

/**
 * @swagger
 * /api/demo/covers:
 *   get:
 *     summary: List the covers the shop already has
 *     description: Public. On the Demo covers cannot be uploaded, so the record form offers these instead. A Record created or updated on the Demo names one of them in its `coverUrl` field
 *     tags: [Demo]
 *     security: []
 *     responses:
 *       200:
 *         description: The existing cover files, as URL paths
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 covers:
 *                   type: array
 *                   items:
 *                     type: string
 *             example:
 *               covers: [/uploads/covers/beatles1.webp, /uploads/covers/pinkfloyd.webp]
 */
router.get("/covers", (req, res) => res.json({ covers: listCovers() }));

/**
 * @swagger
 * /api/demo:
 *   get:
 *     summary: Whether the server runs as the Demo
 *     description: Public. The frontend reads it once at startup to show the demo banner. Demo mode is turned on with DEMO_MODE=true
 *     tags: [Demo]
 *     security: []
 *     responses:
 *       200:
 *         description: The demo status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *             example:
 *               enabled: true
 */
router.get("/", (req, res) => res.json({ enabled: config.demo }));

// Demo sign-in: the seeded accounts are found by role, so their passwords never reach the browser
const { authLimiter } = require("./auth");
const { sendSession } = require("../controllers/authController");
const { readUsers } = require("../lib/usersStore");
const { ADMIN_EMAIL, DEMO_CUSTOMER_EMAIL } = require("../scripts/seed");

const DEMO_EMAILS = { customer: DEMO_CUSTOMER_EMAIL, admin: ADMIN_EMAIL };

/**
 * @swagger
 * /api/demo/signin:
 *   post:
 *     summary: Sign in as a seeded Demo account
 *     description: Public, only in demo mode (404 otherwise). Signs the visitor in as the Demo Customer or the Admin without a password. Answers like /auth/signin and shares its rate limit
 *     tags: [Demo]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, admin]
 *             example:
 *               role: customer
 *     responses:
 *       200:
 *         description: Signed in, same body as /auth/signin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: The role is not customer or admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Demo mode is off
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many sign-in or sign-up attempts from this IP (20 per 15 minutes)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/signin",
  (req, res, next) => (config.demo ? next() : res.status(404).json({ message: "Not found" })),
  authLimiter,
  (req, res) => {
    const role = req.body?.role;
    if (!Object.hasOwn(DEMO_EMAILS, role)) {
      return res.status(400).json({ message: "Role must be customer or admin" });
    }
    try {
      const user = readUsers().find((u) => u.email === DEMO_EMAILS[role] && u.role === role);
      if (!user) {
        return res.status(500).json({ message: "The Demo account is missing" });
      }
      sendSession(res, user);
    } catch (error) {
      console.error("Demo signin error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
