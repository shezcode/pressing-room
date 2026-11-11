const auth = require("./auth");

// Role checks for protecting routes. Each is a list of handlers: `auth` first
// (401 without a valid token), then the role test (403 for the wrong role).
// Use them directly as route middleware: router.post("/", adminOnly, handler)
const requireRole = (role, message) => [
  auth,
  (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message });
    }
    next();
  },
];

const adminOnly = requireRole("admin", "Admin access required");
const customerOnly = requireRole("customer", "Customer access required");

module.exports = { adminOnly, customerOnly };
