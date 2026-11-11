const { readRecords } = require("../lib/recordsStore");
const { readOrders } = require("../lib/ordersStore");

// Derive the signed-in Customer's Collection from their Orders: each Record
// once, with the total quantity bought across all their Orders. The details
// come from the Order line snapshots (see ADR-0001), so an entry survives the
// shop deleting or editing the Record; `inShop` tells whether it still exists.
exports.getCollection = (req, res) => {
  const orders = readOrders().filter(
    (order) => order.customerId === req.user.userId
  );
  const shopRecordIds = new Set(readRecords().map((record) => record.id));
  const entries = new Map();

  // Newest Order first, so each entry shows its latest snapshot and the
  // Collection lists the most recently bought Records first
  for (const order of orders.reverse()) {
    for (const line of order.lines) {
      const entry = entries.get(line.recordId);

      if (entry) {
        entry.quantity += line.quantity;
      } else {
        entries.set(line.recordId, {
          recordId: line.recordId,
          artist: line.artist,
          title: line.title,
          format: line.format,
          coverUrl: line.coverUrl,
          quantity: line.quantity,
          inShop: shopRecordIds.has(line.recordId),
        });
      }
    }
  }

  res.json([...entries.values()]);
};
