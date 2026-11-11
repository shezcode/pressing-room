const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const recordRoutes = require("./routes/records");
const subscriberRoutes = require("./routes/subscribers");
const orderRoutes = require("./routes/orders");
const collectionRoutes = require("./routes/collection");
const authRoutes = require("./routes/auth");
const locationRoutes = require("./routes/location");
const demoRoutes = require("./routes/demo");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./lib/config");

const app = express();
const PORT = config.port;

// Production runs behind one reverse proxy (Nginx Proxy Manager): trust its
// X-Forwarded-For so rate limits apply per visitor, not to the proxy's IP
if (config.production) {
  app.set("trust proxy", 1);
}

// Middleware
// same-site, not helmet's same-origin: the dev frontend on another localhost port shows the covers
// upgrade-insecure-requests only in production, so the Swagger UI loads over plain http locally
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: config.production ? [] : null },
    },
  })
);
app.use(cors({ origin: config.allowedOrigins }));
// Small bodies only: covers arrive as multipart, which coverUpload limits on its own
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Health check for Docker: no file reads, so it only says the process is serving
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// API Routes
app.use("/api/records", recordRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/auth", authRoutes);
app.use("/location", locationRoutes);
app.use("/api/demo", demoRoutes);

// Uploaded cover images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Swagger JSON
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Production serves the built Angular app (copied into public/ by the Dockerfile) from the
// same origin as the API. Hash routing means no index.html fallback is needed.
if (config.production) {
  app.use(express.static(path.join(__dirname, "public")));
}

// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Pressing Room API",
    documentation: "Check /api-docs for the API documentation",
    authentication: {
      signup: "POST /auth/signup",
      signin: "POST /auth/signin",
    },
    location: {
      getCountries: "GET /location/countries",
      getCommunities: "GET /location/communities",
      getProvincesByCommunity: "GET /location/provinces/:communityId",
    },
    records: {
      getRecords: "GET /api/records",
      getRecordById: "GET /api/records/:id",
      createRecord: "POST /api/records (Admin only, multipart)",
      updateRecord: "PUT /api/records/:id (Admin only, multipart)",
      deleteRecord: "DELETE /api/records/:id (Admin only)",
    },
    orders: {
      placeOrder: "POST /api/orders (Customer only)",
      getOrderById: "GET /api/orders/:id (Customer only, owner only)",
    },
    collection: {
      getCollection: "GET /api/collection (Customer only)",
    },
    subscribers: {
      subscribe: "POST /api/subscribers",
    },
  });
});

// Start server
// The Demo starts from the seed every time (the nightly reset is a restart)
if (config.demo && !require("./scripts/seed").seed({ demo: true })) {
  process.exit(1);
}
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});
