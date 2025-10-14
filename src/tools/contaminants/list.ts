// Contaminants List Tool - Query contaminants with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContaminantsListTool extends BaseTool {
  name = "contaminants_list";
  description = "Query contaminants with filters for shipment, facility, risk level, and chemical levels";

  schema = {
    params: {
      shipment_ids: {
        type: "string",
        description: "Comma-separated shipment IDs",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false,
      },
      date_from: {
        type: "string",
        description: "Start date for detection (ISO 8601)",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date for detection (ISO 8601)",
        required: false,
      },
      type: {
        type: "string",
        description: "Contaminant type (Lead, Mercury, etc.)",
        required: false,
      },
      risk_level: {
        type: "string",
        description: "Risk level (low, medium, high, critical)",
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
      description: "List of contaminants matching the criteria",
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
      if (params.risk_level) {
        const riskValidation = this.validateEnum(
          params.risk_level,
          ["low", "medium", "high", "critical"],
          "risk_level"
        );
        if (!riskValidation.valid) {
          throw new Error(riskValidation.error);
        }
      }

      // Apply default limit
      const limit = params.limit || parseInt(process.env.DEFAULT_LIST_LIMIT || '50');
      if (limit > 500) {
        throw new Error('Limit cannot exceed 500');
      }

      const queryParams: Record<string, string> = {};
      if (params.shipment_ids) queryParams.shipment_ids = params.shipment_ids;
      if (params.facility_id) queryParams.facility_id = params.facility_id;
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.type) queryParams.type = params.type;
      if (params.risk_level) queryParams.risk_level = params.risk_level;
      queryParams.limit = limit.toString();

      const response = await this.get("/contaminants-detected", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const contaminants = apiData.success ? apiData.data : apiData;

      // Cache the result
      this.cacheResult(params, contaminants);

      return this.success(contaminants, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

