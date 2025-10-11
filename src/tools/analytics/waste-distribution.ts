// Analytics Waste Distribution Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class AnalyticsWasteDistributionTool extends BaseTool {
  name = "analytics_waste_distribution";
  description = "Get waste type distribution with shipment counts and contamination rates by type";

  schema = {
    params: {},
    returns: {
      type: "array",
      description: "Waste type distribution statistics",
    },
  };

  async execute(_params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const response = await this.get("/analytics/waste-type-distribution");

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

