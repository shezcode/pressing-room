const { readRecords, writeRecords } = require("../lib/recordsStore");
const { readOrders, writeOrders } = require("../lib/ordersStore");
const { validateShippingAddress } = require("../lib/addressValidation");

const MAX_LINES = 100;

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// Check the requested lines against the stored Records. Returns the failing
// lines (missing Record or not enough stock) and, when none fail, the Order
// lines snapshotting each Record as it is now (see ADR-0001).
const checkLines = (lines, records) => {
  const failures = [];
  const orderLines = [];

  for (const { recordId, quantity } of lines) {
    const record = records.find((r) => r.id === recordId);

    if (!record) {
      failures.push({ recordId, quantity, reason: "missing", available: 0 });
    } else if (record.stock < quantity) {
      failures.push({
        recordId,
        quantity,
        reason: "insufficientStock",
        available: record.stock,
      });
    } else {
      orderLines.push({
        recordId,
        artist: record.artist,
        title: record.title,
        format: record.format,
        price: record.price,
        coverUrl: record.coverUrl,
        quantity,
      });
    }
  }

  return { failures, orderLines };
};

// Validate the request's lines: a non-empty list of { recordId, quantity },
// each Record at most once. Returns a message, or null when the lines are valid.
const linesError = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "lines must be a non-empty list";
  }
  if (lines.length > MAX_LINES) {
    return `An Order can have at most ${MAX_LINES} lines`;
  }
  if (
    !lines.every(
      (line) =>
        typeof line?.recordId === "string" && isPositiveInt(line.quantity)
    )
  ) {
    return "Each line needs a recordId and a positive whole quantity";
  }
  if (new Set(lines.map((line) => line.recordId)).size !== lines.length) {
    return "Each Record can appear in only one line";
  }
  return null;
};

// Place an Order for the signed-in Customer. Prices come from the stored
// Records, never from the request. Stock is checked and reduced in this one
// synchronous handler, so no other request can run in between; if any line
// fails, nothing is reduced and every failing line is listed.
exports.placeOrder = (req, res) => {
  const { lines, shippingAddress } = req.body ?? {};

  const invalidLines = linesError(lines);
  if (invalidLines) {
    return res.status(400).json({ message: invalidLines });
  }

  const address = validateShippingAddress(shippingAddress);
  if (Object.keys(address.errors).length > 0) {
    return res
      .status(400)
      .json({ message: "Validation failed", errors: address.errors });
  }

  // Read both files before writing either, so a read failure changes nothing
  const records = readRecords();
  const orders = readOrders();
  const { failures, orderLines } = checkLines(
    lines.map(({ recordId, quantity }) => ({ recordId, quantity })),
    records
  );

  if (failures.length > 0) {
    return res.status(409).json({
      code: "ORDER_REJECTED",
      message: "Some Records are missing or lack stock",
      lines: failures,
    });
  }

  const order = {
    id: crypto.randomUUID(),
    customerId: req.user.userId,
    lines: orderLines,
    shippingAddress: address.values,
    total: orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    status: "Placed",
    datePlaced: new Date().toISOString(),
  };

  const ordered = new Map(orderLines.map((line) => [line.recordId, line.quantity]));
  const reduced = records.map((record) =>
    ordered.has(record.id)
      ? { ...record, stock: record.stock - ordered.get(record.id) }
      : record
  );

  if (!writeRecords(reduced)) {
    return res.status(500).json({ message: "Could not place the Order" });
  }

  if (!writeOrders([...orders, order])) {
    // Put the stock back so a failed Order leaves the catalog as it was
    if (!writeRecords(records)) {
      console.error(`Stock was reduced for Order ${order.id} but the Order was not saved`);
    }
    return res.status(500).json({ message: "Could not place the Order" });
  }

  res.status(201).json(order);
};

// Get one of the signed-in Customer's Orders. Someone else's Order answers
// 404, like a missing one, so Order ids cannot be probed.
exports.getOrderById = (req, res) => {
  const order = readOrders().find(
    (o) => o.id === req.params.id && o.customerId === req.user.userId
  );

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json(order);
};
