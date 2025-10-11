// Facilities with Activity - Relationship Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class FacilitiesWithActivityTool extends BaseTool {
  name = "facilities_get_with_activity";
  description = "Get a facility with all recent shipments and inspections for a time period";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Facility ID",
        required: true,
      },
      days: {
        type: "number",
        description: "Number of days to look back (default: 30)",
        required: false,
        default: 30,
      },
    },
    returns: {
      type: "object",
      description: "Facility with recent activity",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const days = params.days || 30;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateFromStr = dateFrom.toISOString().split("T")[0];

      // Get facility
      const facilityResponse = await this.get(`/facilities/${params.id}`);
      const result: any = { ...facilityResponse.data };

      // Get recent shipments
      const shipmentsResponse = await this.get("/shipments", {
        facility_id: params.id,
        date_from: dateFromStr,
      });

      // Get recent inspections
      const inspectionsResponse = await this.get("/inspections", {
        facility_id: params.id,
        date_from: dateFromStr,
      });

      result.data.recent_shipments = shipmentsResponse.data?.data || [];
      result.data.recent_inspections = inspectionsResponse.data?.data || [];
      result.data.activity_period_days = days;

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

