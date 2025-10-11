// Tool Registry - Export all tools and provide registration helper
import { MCPServer } from "../mcp/server.js";

// Import all Shipments tools
import { ShipmentsListTool } from "./shipments/list.js";
import { ShipmentsGetTool } from "./shipments/get.js";
import { ShipmentsCreateTool } from "./shipments/create.js";
import { ShipmentsUpdateTool } from "./shipments/update.js";
import { ShipmentsDeleteTool } from "./shipments/delete.js";

// Import all Facilities tools
import { FacilitiesListTool } from "./facilities/list.js";
import { FacilitiesGetTool } from "./facilities/get.js";
import { FacilitiesCreateTool } from "./facilities/create.js";
import { FacilitiesUpdateTool } from "./facilities/update.js";
import { FacilitiesDeleteTool } from "./facilities/delete.js";

// Import all Contaminants tools
import { ContaminantsListTool } from "./contaminants/list.js";
import { ContaminantsGetTool } from "./contaminants/get.js";
import { ContaminantsCreateTool } from "./contaminants/create.js";
import { ContaminantsUpdateTool } from "./contaminants/update.js";
import { ContaminantsDeleteTool } from "./contaminants/delete.js";

// Import all Inspections tools
import { InspectionsListTool } from "./inspections/list.js";
import { InspectionsGetTool } from "./inspections/get.js";
import { InspectionsCreateTool } from "./inspections/create.js";
import { InspectionsUpdateTool } from "./inspections/update.js";
import { InspectionsDeleteTool } from "./inspections/delete.js";

// Import all Analytics tools
import { AnalyticsContaminationRateTool } from "./analytics/contamination-rate.js";
import { AnalyticsFacilityPerformanceTool } from "./analytics/facility-performance.js";
import { AnalyticsWasteDistributionTool } from "./analytics/waste-distribution.js";
import { AnalyticsRiskTrendsTool } from "./analytics/risk-trends.js";

// Import all Relationship tools
import { ShipmentsWithContaminantsTool } from "./relationships/shipments-with-contaminants.js";
import { ShipmentsDetailedTool } from "./relationships/shipments-detailed.js";
import { FacilitiesWithActivityTool } from "./relationships/facilities-with-activity.js";
import { FacilitiesDetailedTool } from "./relationships/facilities-detailed.js";
import { InspectionsDetailedTool } from "./relationships/inspections-detailed.js";

// Import Database tools
import { DatabaseResetTool } from "./reset.js";

export function registerAllTools(
  server: MCPServer,
  apiBaseUrl: string
): void {
  // Register Shipments tools (5)
  server.registerTool(new ShipmentsListTool(apiBaseUrl));
  server.registerTool(new ShipmentsGetTool(apiBaseUrl));
  server.registerTool(new ShipmentsCreateTool(apiBaseUrl));
  server.registerTool(new ShipmentsUpdateTool(apiBaseUrl));
  server.registerTool(new ShipmentsDeleteTool(apiBaseUrl));

  // Register Facilities tools (5)
  server.registerTool(new FacilitiesListTool(apiBaseUrl));
  server.registerTool(new FacilitiesGetTool(apiBaseUrl));
  server.registerTool(new FacilitiesCreateTool(apiBaseUrl));
  server.registerTool(new FacilitiesUpdateTool(apiBaseUrl));
  server.registerTool(new FacilitiesDeleteTool(apiBaseUrl));

  // Register Contaminants tools (5)
  server.registerTool(new ContaminantsListTool(apiBaseUrl));
  server.registerTool(new ContaminantsGetTool(apiBaseUrl));
  server.registerTool(new ContaminantsCreateTool(apiBaseUrl));
  server.registerTool(new ContaminantsUpdateTool(apiBaseUrl));
  server.registerTool(new ContaminantsDeleteTool(apiBaseUrl));

  // Register Inspections tools (5)
  server.registerTool(new InspectionsListTool(apiBaseUrl));
  server.registerTool(new InspectionsGetTool(apiBaseUrl));
  server.registerTool(new InspectionsCreateTool(apiBaseUrl));
  server.registerTool(new InspectionsUpdateTool(apiBaseUrl));
  server.registerTool(new InspectionsDeleteTool(apiBaseUrl));

  // Register Analytics tools (4)
  server.registerTool(new AnalyticsContaminationRateTool(apiBaseUrl));
  server.registerTool(new AnalyticsFacilityPerformanceTool(apiBaseUrl));
  server.registerTool(new AnalyticsWasteDistributionTool(apiBaseUrl));
  server.registerTool(new AnalyticsRiskTrendsTool(apiBaseUrl));

  // Register Relationship tools (5)
  server.registerTool(new ShipmentsWithContaminantsTool(apiBaseUrl));
  server.registerTool(new ShipmentsDetailedTool(apiBaseUrl));
  server.registerTool(new FacilitiesWithActivityTool(apiBaseUrl));
  server.registerTool(new FacilitiesDetailedTool(apiBaseUrl));
  server.registerTool(new InspectionsDetailedTool(apiBaseUrl));

  // Register Database tools (1)
  server.registerTool(new DatabaseResetTool(apiBaseUrl));

  console.error("✓ Registered 30 comprehensive waste management tools:");
  console.error("  - 20 CRUD operations (list/get/create/update/delete for 4 resources)");
  console.error("  - 4 Analytics tools");
  console.error("  - 5 Relationship tools");
  console.error("  - 1 Database management tool");
}

// Export all tools for testing
export {
  // Shipments
  ShipmentsListTool,
  ShipmentsGetTool,
  ShipmentsCreateTool,
  ShipmentsUpdateTool,
  ShipmentsDeleteTool,
  // Facilities
  FacilitiesListTool,
  FacilitiesGetTool,
  FacilitiesCreateTool,
  FacilitiesUpdateTool,
  FacilitiesDeleteTool,
  // Contaminants
  ContaminantsListTool,
  ContaminantsGetTool,
  ContaminantsCreateTool,
  ContaminantsUpdateTool,
  ContaminantsDeleteTool,
  // Inspections
  InspectionsListTool,
  InspectionsGetTool,
  InspectionsCreateTool,
  InspectionsUpdateTool,
  InspectionsDeleteTool,
  // Analytics
  AnalyticsContaminationRateTool,
  AnalyticsFacilityPerformanceTool,
  AnalyticsWasteDistributionTool,
  AnalyticsRiskTrendsTool,
  // Relationships
  ShipmentsWithContaminantsTool,
  ShipmentsDetailedTool,
  FacilitiesWithActivityTool,
  FacilitiesDetailedTool,
  InspectionsDetailedTool,
  // Database
  DatabaseResetTool,
};

// Export types
export * from "./types.js";
