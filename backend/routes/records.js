const express = require("express");
const router = express.Router();
const recordController = require("../controllers/recordController");
const { adminOnly } = require("../middleware/roles");
const { parseCover } = require("../lib/coverUpload");

/**
 * @swagger
 * tags:
 *   - name: Records
 *     description: The shop's catalog of Records
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: Get a page of Records
 *     description: Public. Returns Records newest first, including Out of stock ones, with the total count of Records matching the filters
 *     tags: [Records]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         description: Words to look for in the artist and title, ignoring case and accents. Every word must match
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         required: false
 *         description: Only return Records of this Format
 *         schema:
 *           type: string
 *           enum: [Vinyl, CD, Cassette]
 *       - in: query
 *         name: featured
 *         required: false
 *         description: Only return Featured Records (the only accepted value is true)
 *         schema:
 *           type: boolean
 *           enum: [true]
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number, starting at 1 (defaults to 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Records per page (defaults to 12, at most 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: A page of Records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Record'
 *                 total:
 *                   type: integer
 *                   description: Number of Records matching the filters, across all pages
 *                   example: 11
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 9
 *       400:
 *         description: Invalid page, limit, format or featured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", recordController.getRecords);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     summary: Get a Record by ID
 *     description: Public. Retrieve a single Record
 *     tags: [Records]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique ID of the Record
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The Record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", recordController.getRecordById);

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a Record
 *     description: Admin only. Multipart upload with the cover image. On the Demo uploads are refused, and the body names an existing cover in `coverUrl` instead (see GET /api/demo/covers). The new Record is added at the top of the shop. Every field is validated; errors are listed per field
 *     tags: [Records]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [artist, title, format, year, price, stock, cover]
 *             properties:
 *               artist:
 *                 type: string
 *                 example: Pink Floyd
 *               title:
 *                 type: string
 *                 example: The Dark Side of the Moon
 *               format:
 *                 type: string
 *                 enum: [Vinyl, CD, Cassette]
 *               variant:
 *                 type: string
 *                 description: Optional, for example LP or 2xLP
 *               year:
 *                 type: integer
 *                 description: Release year, from 1877 to next year
 *               genre:
 *                 type: string
 *               price:
 *                 type: integer
 *                 description: Price in USD cents, zero or more
 *               stock:
 *                 type: integer
 *                 description: Copies in stock, zero or more
 *               featured:
 *                 type: boolean
 *                 description: Whether this is a Featured Record (defaults to false)
 *               description:
 *                 type: string
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image, JPEG, PNG or WebP, at most 5 MB. Not on the Demo
 *               coverUrl:
 *                 type: string
 *                 description: Demo only, and then required. One of the covers listed by GET /api/demo/covers
 *                 example: /uploads/covers/pinkfloyd.webp
 *     responses:
 *       201:
 *         description: The created Record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Validation failed
 *                 errors:
 *                   type: object
 *                   description: Message per invalid field
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     price: Price must be a non-negative whole number
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not the Admin, or a cover file was uploaded on the Demo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", adminOnly, parseCover, recordController.createRecord);

/**
 * @swagger
 * /api/records/{id}:
 *   put:
 *     summary: Update a Record
 *     description: Admin only. Replaces every field of the Record, validated like creation, and optionally its cover. Without a `cover` file the Record keeps its current cover. On the Demo uploads are refused, and an optional `coverUrl` switches to another existing cover (see GET /api/demo/covers). Stock and the Featured flag are changed here too. The id and date added never change. A replaced cover file stays on disk
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique ID of the Record
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [artist, title, format, year, price, stock]
 *             properties:
 *               artist:
 *                 type: string
 *               title:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [Vinyl, CD, Cassette]
 *               variant:
 *                 type: string
 *                 description: Optional, for example LP or 2xLP. Empty removes it
 *               year:
 *                 type: integer
 *                 description: Release year, from 1877 to next year
 *               genre:
 *                 type: string
 *               price:
 *                 type: integer
 *                 description: Price in USD cents, zero or more
 *               stock:
 *                 type: integer
 *                 description: Copies in stock, zero or more
 *               featured:
 *                 type: boolean
 *                 description: Whether this is a Featured Record (defaults to false)
 *               description:
 *                 type: string
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Optional replacement cover, JPEG, PNG or WebP, at most 5 MB. Not on the Demo
 *               coverUrl:
 *                 type: string
 *                 description: Demo only, optional. Switches to one of the covers listed by GET /api/demo/covers
 *     responses:
 *       200:
 *         description: The updated Record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Validation failed
 *                 errors:
 *                   type: object
 *                   description: Message per invalid field
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     stock: Stock must be a non-negative whole number
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not the Admin, or a cover file was uploaded on the Demo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", adminOnly, parseCover, recordController.updateRecord);

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     summary: Delete a Record
 *     description: Admin only. Removes the Record from the shop. Its cover file stays on disk, and existing Order lines are not affected
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique ID of the Record
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: The Record was deleted
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not the Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", adminOnly, recordController.deleteRecord);

module.exports = router;
