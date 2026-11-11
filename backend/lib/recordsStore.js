const fs = require("fs");
const path = require("path");

const recordsPath = path.join(__dirname, "../db/records.json");

// Read every stored Record (unsorted)
const readRecords = () => {
  try {
    const data = fs.readFileSync(recordsPath, "utf8");
    return JSON.parse(data).records;
  } catch (error) {
    console.error("Error reading records:", error);
    return [];
  }
};

// Replace the stored Records
const writeRecords = (records) => {
  try {
    fs.writeFileSync(
      recordsPath,
      JSON.stringify({ records }, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error("Error writing records:", error);
    return false;
  }
};

module.exports = { readRecords, writeRecords };
