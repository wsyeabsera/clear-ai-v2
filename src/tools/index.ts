// Tool Registry - Export all tools and provide registration helper
import { MCPServer } from "../mcp/server.js";
import { ShipmentsTool } from "./shipments.js";
import { FacilitiesTool } from "./facilities.js";
import { ContaminantsTool } from "./contaminants.js";
import { InspectionsTool } from "./inspections.js";

export function registerAllTools(
  server: MCPServer,
  apiBaseUrl: string
): void {
  // Register all tools with the MCP server
  server.registerTool(new ShipmentsTool(apiBaseUrl));
  server.registerTool(new FacilitiesTool(apiBaseUrl));
  server.registerTool(new ContaminantsTool(apiBaseUrl));
  server.registerTool(new InspectionsTool(apiBaseUrl));

  console.error("✓ Registered 4 waste management tools");
}

// Export tools for testing
export { ShipmentsTool, FacilitiesTool, ContaminantsTool, InspectionsTool };

// Export types
export * from "./types.js";

