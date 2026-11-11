const express = require("express");
const router = express.Router();
const collectionController = require("../controllers/collectionController");
const { customerOnly } = require("../middleware/roles");

/**
 * @swagger
 * tags:
 *   - name: Collection
 *     description: The Records a Customer has bought
 */

/**
 * @swagger
 * /api/collection:
 *   get:
 *     summary: Get your Collection
 *     description: Customer only. Derived from the caller's Orders - each Record once, with the total quantity bought across all their Orders, most recently bought first. Details come from the Order line snapshots, so an entry stays after the shop deletes the Record
 *     tags: [Collection]
 *     responses:
 *       200:
 *         description: The Collection (empty when the Customer has no Orders)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CollectionEntry'
 *       401:
 *         description: No valid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a Customer (the Admin has no Collection)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", customerOnly, collectionController.getCollection);

module.exports = router;
