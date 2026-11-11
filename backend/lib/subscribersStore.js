const fs = require("fs");
const path = require("path");

const subscribersPath = path.join(__dirname, "../db/subscribers.json");

// Read every stored Subscriber. Only a missing file means an empty list: any
// other failure throws, because every signup rewrites the file and an empty
// fallback would wipe the Subscribers already stored.
const readSubscribers = () => {
  try {
    return JSON.parse(fs.readFileSync(subscribersPath, "utf8")).subscribers;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("Error reading subscribers:", error);
    throw error;
  }
};

// Replace the stored Subscribers
const writeSubscribers = (subscribers) => {
  try {
    fs.writeFileSync(
      subscribersPath,
      JSON.stringify({ subscribers }, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error("Error writing subscribers:", error);
    return false;
  }
};

module.exports = { readSubscribers, writeSubscribers };
