// Server settings read from the environment. Local development needs no setup;
// production must provide JWT_SECRET.
const DEV_JWT_SECRET = "dev-only-insecure-secret";

const loadConfig = (env, warn = console.warn) => {
  const production = env.NODE_ENV === "production";
  let jwtSecret = env.JWT_SECRET;

  if (!jwtSecret) {
    if (production) {
      throw new Error("JWT_SECRET must be set when NODE_ENV=production. Refusing to start.");
    }
    warn("JWT_SECRET is not set: using a development-only secret. Never run like this in production.");
    jwtSecret = DEV_JWT_SECRET;
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS || "http://localhost:4200")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    production,
    jwtSecret,
    allowedOrigins,
    port: Number(env.PORT) || 3000,
    demo: env.DEMO_MODE === "true",
  };
};

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

module.exports = { ...config, loadConfig };
