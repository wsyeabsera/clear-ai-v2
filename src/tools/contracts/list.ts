// Contracts List Tool - Query contracts with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsListTool extends BaseTool {
  name = "contracts_list";
  description = "Query contracts with filters for producer, facility, status, and waste types";

  schema = {
    params: {
      producer_id: {
        type: "string",
        description: "Filter by producer ID",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false,
      },
      status: {
        type: "string",
        description: "Contract status (active, expired, suspended)",
        required: false,
      },
      start_date: {
        type: "string",
        description: "Filter contracts starting from this date (ISO 8601)",
        required: false,
      },
      end_date: {
        type: "string",
        description: "Filter contracts ending before this date (ISO 8601)",
        required: false,
      },
      waste_type: {
        type: "string",
        description: "Filter by waste type code (e.g., 191212, 150101)",
        required: false,
      },
      limit: {
        type: "number",
        description: "Maximum results to return",
        required: false,
        default: 100,
      },
    },
    returns: {
      type: "array",
      description: "List of contracts matching the criteria",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate enum values
      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["active", "expired", "suspended"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.producer_id) queryParams.producer_id = params.producer_id;
      if (params.facility_id) queryParams.facility_id = params.facility_id;
      if (params.status) queryParams.status = params.status;
      if (params.start_date) queryParams.start_date = params.start_date;
      if (params.end_date) queryParams.end_date = params.end_date;
      if (params.waste_type) queryParams.waste_type = params.waste_type;
      queryParams.limit = (params.limit || 100).toString();

      const response = await this.get("/contracts", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const contracts = apiData.success ? apiData.data : apiData;

      return this.success(contracts, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
