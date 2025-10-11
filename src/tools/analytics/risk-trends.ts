// Analytics Risk Trends Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class AnalyticsRiskTrendsTool extends BaseTool {
  name = "analytics_risk_trends";
  description = "Get contaminant risk trends over time with daily breakdown by risk level";

  schema = {
    params: {
      days: {
        type: "number",
        description: "Number of days to look back (default: 30)",
        required: false,
        default: 30,
      },
    },
    returns: {
      type: "object",
      description: "Risk trends over time",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const queryParams: Record<string, string> = {};
      if (params.days) {
        queryParams.days = params.days.toString();
      }

      const response = await this.get("/analytics/risk-trends", queryParams);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

