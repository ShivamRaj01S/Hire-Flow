require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { connectMySQL } = require("./src/db/mysql");
const { connectMongo } = require("./src/db/mongo");
const sqlModels = require("./src/models/sql");
const { apiRoutes } = require("./src/routes");
const { notFoundHandler, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

// Basic security headers
app.use(
  helmet({
    // Keep CSP relaxed for now; we'll tighten once UI/hosting is finalized.
    contentSecurityPolicy: false
  })
);

// Lock down allowed origins (Phase 2 can tighten per-environment)
const corsOrigin =
  process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim().length > 0
    ? process.env.CORS_ORIGIN
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : false;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);

// Mitigate brute-force/abuse for API routes only.
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 500),
  standardHeaders: true,
  legacyHeaders: false
});

// Limit payload sizes for performance and to reduce attack surface
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiLimiter, apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Boot connections on startup.
// If DB env vars are not configured yet (common during early dev),
// keep the server running so UI can still be reviewed (e.g., /health).
async function bootstrap() {
  const tasks = [];

  if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE) {
    tasks.push(
      connectMySQL()
        .then(() => sqlModels.initSqlModels())
        .then(() => sqlModels.sequelize.sync({ alter: false }))
    );
  } else {
    console.warn("MySQL not configured (MYSQL_HOST/MYSQL_DATABASE missing). Skipping.");
  }

  if (process.env.MONGODB_URI) {
    tasks.push(connectMongo());
  } else {
    console.warn("MongoDB not configured (MONGODB_URI missing). Skipping.");
  }

  await Promise.all(tasks);

  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    // Avoid logging secrets.
    console.log(`Hire Flow backend listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Backend failed to start:", err?.message || err);
  process.exit(1);
});

