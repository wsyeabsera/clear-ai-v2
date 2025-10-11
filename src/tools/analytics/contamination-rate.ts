// Analytics Contamination Rate Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class AnalyticsContaminationRateTool extends BaseTool {
  name = "analytics_contamination_rate";
  description = "Get overall contamination statistics including rate percentage and risk level distribution";

  schema = {
    params: {},
    returns: {
      type: "object",
      description: "Contamination statistics",
    },
  };

  async execute(_params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const response = await this.get("/analytics/contamination-rate");

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

