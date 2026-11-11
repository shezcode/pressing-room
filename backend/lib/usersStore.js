const fs = require("fs");
const path = require("path");

const usersPath = path.join(__dirname, "../db/users.json");

// Read every stored user. Only a missing file means an empty list: any other
// failure throws, because every signup rewrites the file and an empty
// fallback would wipe the users already stored.
const readUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(usersPath, "utf8")).users;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("Error reading users:", error);
    throw error;
  }
};

// Replace the stored users
const writeUsers = (users) => {
  try {
    fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing users:", error);
    return false;
  }
};

module.exports = { readUsers, writeUsers };
