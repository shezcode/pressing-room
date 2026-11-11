const fs = require("fs");
const path = require("path");

const ordersPath = path.join(__dirname, "../db/orders.json");

// Read every stored Order. Only a missing file means an empty list: any other
// failure throws, because every new Order rewrites the file and an empty
// fallback would wipe the Orders already stored.
const readOrders = () => {
  try {
    return JSON.parse(fs.readFileSync(ordersPath, "utf8")).orders;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("Error reading orders:", error);
    throw error;
  }
};

// Replace the stored Orders
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ordersPath, JSON.stringify({ orders }, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing orders:", error);
    return false;
  }
};

module.exports = { readOrders, writeOrders };
