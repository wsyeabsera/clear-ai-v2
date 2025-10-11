// Analytics Facility Performance Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class AnalyticsFacilityPerformanceTool extends BaseTool {
  name = "analytics_facility_performance";
  description = "Get facility performance metrics including acceptance and rejection rates for all facilities";

  schema = {
    params: {},
    returns: {
      type: "array",
      description: "Performance metrics by facility",
    },
  };

  async execute(_params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const response = await this.get("/analytics/facility-performance");

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

