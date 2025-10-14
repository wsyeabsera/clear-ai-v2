// Shipments List Tool - Query shipments with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentsListTool extends BaseTool {
  name = "shipments_list";
  description =
    "Query shipments with filters for date range, status, facility, contamination, waste type, and carrier";

  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date (ISO 8601 format)",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date (ISO 8601 format)",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false,
      },
      status: {
        type: "string",
        description: "Shipment status (pending, in_transit, delivered, rejected)",
        required: false,
      },
      has_contaminants: {
        type: "boolean",
        description: "Filter by contamination status",
        required: false,
      },
      waste_type: {
        type: "string",
        description: "Filter by waste type (plastic, metal, paper, etc.)",
        required: false,
      },
      carrier: {
        type: "string",
        description: "Filter by carrier name",
        required: false,
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 50, max: 500)",
        required: false,
        min: 1,
        max: 500,
      },
    },
    returns: {
      type: "array",
      description: "List of shipments matching the criteria",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    

    try {
      // Check cache first
      const cachedResult = this.getCachedResult(params);
      if (cachedResult) {
        return this.success(cachedResult, Date.now() - startTime);
      }

      // Validate enum values
      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["pending", "in_transit", "delivered", "rejected"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      // Apply default limit
      const limit = params.limit || parseInt(process.env.DEFAULT_LIST_LIMIT || '50');
      if (limit > 500) {
        throw new Error('Limit cannot exceed 500');
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.facility_id) queryParams.facility_id = params.facility_id;
      if (params.status) queryParams.status = params.status;
      if (params.has_contaminants !== undefined) {
        queryParams.has_contaminants = params.has_contaminants.toString();
      }
      if (params.waste_type) queryParams.waste_type = params.waste_type;
      if (params.carrier) queryParams.carrier = params.carrier;
      queryParams.limit = limit.toString();

      const response = await this.get("/shipments", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const shipments = apiData.success ? apiData.data : apiData;

      // Cache the result
      this.cacheResult(params, shipments);

      return this.success(shipments, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

