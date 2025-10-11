#!/usr/bin/env node

// Main entry point for the MCP server
import { MCPServer } from "./mcp/server.js";
import { registerAllTools } from "./tools/index.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Get configuration from environment
    const apiBaseUrl =
      process.env.WASTEER_API_URL || "http://localhost:4000/api";
    const serverName = "clear-ai-v2-mcp-server";
    const serverVersion = "1.0.0";

    console.error("Starting MCP Server...");
    console.error(`API Base URL: ${apiBaseUrl}`);

    // Create and configure server
    const server = new MCPServer(serverName, serverVersion);

    // Register all tools
    registerAllTools(server, apiBaseUrl);

    // Start the server
    await server.start();

    console.error("✓ MCP Server is ready");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});

// Start the server
main();

