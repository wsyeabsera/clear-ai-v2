#!/usr/bin/env node

// Express API Server for Waste Management
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "./db/connection.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { swaggerSpec } from "./swagger.js";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4000');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: any, _res: any, next: any) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (_req: any, res: any) => {
  res.json({
    success: true,
    message: "Waste Management API is running",
    timestamp: new Date().toISOString(),
  });
});

// Swagger documentation
app.use("/api-docs", swaggerUi.serve as any);
app.get("/api-docs", swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Waste Management API Docs",
}) as any);

// Swagger JSON endpoint
app.get("/swagger.json", (_req: any, res: any) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API routes
app.use("/api", routes);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening on 0.0.0.0 for Railway/cloud deployments
    app.listen(PORT, '0.0.0.0', () => {
      const host = process.env.NODE_ENV === 'production' 
        ? process.env.PUBLIC_URL || `http://0.0.0.0:${PORT}`
        : `http://localhost:${PORT}`;
      
      console.log(`\n✓ Waste Management API server running on ${host}`);
      console.log(`✓ Health check: ${host}/health`);
      console.log(`✓ API Documentation: ${host}/api-docs`);
      console.log(`✓ API endpoints: ${host}/api`);
      console.log("\nAvailable endpoints:");
      console.log(`  - GET/POST/PUT/DELETE /api/shipments`);
      console.log(`  - GET/POST/PUT/DELETE /api/facilities`);
      console.log(`  - GET/POST/PUT/DELETE /api/contaminants-detected`);
      console.log(`  - GET/POST/PUT/DELETE /api/inspections`);
      console.log(`  - GET /api/analytics/*`);
      console.log("\nPress Ctrl+C to stop\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down API server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\nShutting down API server...");
  process.exit(0);
});

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

