import express from "express";
import cors from "cors";
import { PORT, CLIENT_URL } from "./config/env.js";
import { testConnection } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// CORS configuration supporting any Vite frontend port and dev hosts
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for development
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint verifying MySQL connection
app.get("/api/health", async (req, res) => {
  const dbStatus = await testConnection();
  if (dbStatus.success) {
    return res.status(200).json({
      success: true,
      message: "MediLink backend is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      success: false,
      message: "MediLink backend is running but database is disconnected",
      database: "disconnected",
      error: dbStatus.error,
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount all API routes
app.use("/api", apiRoutes);

// 404 Route Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Central Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log("==================================================");
  console.log(`MediLink REST API Server running on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log("==================================================");

  // Test DB connection on startup
  const dbStatus = await testConnection();
  if (dbStatus.success) {
    console.log("[Database] MySQL connected successfully.");
    try {
      const { initCommunicationTables } = await import("./services/communicationService.js");
      await initCommunicationTables();
      console.log("[Communication] Real Email & SMS communication tables initialized.");
    } catch (e) {
      console.warn("[Communication] Table init warning:", e.message);
    }
  } else {
    console.warn(`[Database Warning] Could not connect to MySQL: ${dbStatus.error}`);
    console.warn("Ensure MySQL is running and DB_PASSWORD in backend/.env is correct.");
    console.warn("Run 'npm run db:setup' in backend directory to initialize database tables.");
  }
});

export default app;
