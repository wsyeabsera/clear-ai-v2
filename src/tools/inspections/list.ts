// Inspections List Tool - Query inspections with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class InspectionsListTool extends BaseTool {
  name = "inspections_list";
  description = "Query inspections with filters for date range, status, facility, shipment, and inspection type";

  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date (ISO 8601)",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date (ISO 8601)",
        required: false,
      },
      status: {
        type: "string",
        description: "Inspection status (accepted, rejected, pending)",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false,
      },
      shipment_id: {
        type: "string",
        description: "Filter by shipment ID",
        required: false,
      },
      has_risk_contaminants: {
        type: "boolean",
        description: "Filter inspections with contaminants detected",
        required: false,
      },
    },
    returns: {
      type: "array",
      description: "List of inspections matching the criteria",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["accepted", "rejected", "pending"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      const queryParams: Record<string, string> = {};
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.status) queryParams.status = params.status;
      if (params.facility_id) queryParams.facility_id = params.facility_id;
      if (params.shipment_id) queryParams.shipment_id = params.shipment_id;
      if (params.has_risk_contaminants !== undefined) {
        queryParams.has_risk_contaminants = params.has_risk_contaminants.toString();
      }

      const response = await this.get("/inspections", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const inspections = apiData.success ? apiData.data : apiData;

      return this.success(inspections, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

