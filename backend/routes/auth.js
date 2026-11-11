const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const authController = require("../controllers/authController");

// One budget per IP shared by sign-in and sign-up, to slow brute force and account spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts, please try again later" },
});

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Two roles exist, customer and admin. The token carries the role. Routes that need a signed-in user answer 401 without a valid token; Admin-only routes answer 403 to Customers, and Customer-only routes answer 403 to the Admin
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new Customer
 *     description: Public. Create a Customer account. The account always gets the customer role, whatever role the request body contains. The token (valid 24 hours) carries the role. The Admin is never created here, only by the seed command
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - countryId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *               name:
 *                 type: string
 *                 description: User's name (optional)
 *               countryId:
 *                 type: string
 *                 description: ID from /location/countries
 *               communityId:
 *                 type: string
 *                 description: ID of the autonomous community (required for Spain)
 *               provinceId:
 *                 type: string
 *                 description: ID of the province (required for Spain)
 *             example:
 *               email: "user@example.com"
 *               password: "password123"
 *               name: "John Doe"
 *               countryId: "1"
 *               communityId: "08"
 *               provinceId: "28"
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
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid input or user already exists
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
router.post("/signup", authLimiter, authController.signup);

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: User login
 *     description: Public. Authenticate a Customer or the Admin and get a JWT token (valid 24 hours) that carries the user's role. The seeded Admin signs in with admin@mail.com
 *     tags:
 *       - Authentication
 *     security: []
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
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *             example:
 *               email: "user@example.com"
 *               password: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully
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
 *         description: Invalid credentials
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
router.post("/signin", authLimiter, authController.signin);

module.exports = router;
module.exports.authLimiter = authLimiter;
