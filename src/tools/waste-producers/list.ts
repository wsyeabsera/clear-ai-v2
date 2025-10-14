// Waste Producers List Tool - Query waste producers with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class WasteProducersListTool extends BaseTool {
  name = "waste_producers_list";
  description = "Query waste producers with filters for type, location, and contract count";

  schema = {
    params: {
      type: {
        type: "string",
        description: "Producer type (industrial, commercial, municipal)",
        required: false,
      },
      location: {
        type: "string",
        description: "Filter by location (partial match)",
        required: false,
      },
      license_number: {
        type: "string",
        description: "Filter by license number",
        required: false,
      },
      min_contracts: {
        type: "number",
        description: "Minimum number of active contracts",
        required: false,
      },
      max_contracts: {
        type: "number",
        description: "Maximum number of active contracts",
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
      description: "List of waste producers matching the criteria",
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
      if (params.type) {
        const typeValidation = this.validateEnum(
          params.type,
          ["industrial", "commercial", "municipal"],
          "type"
        );
        if (!typeValidation.valid) {
          throw new Error(typeValidation.error);
        }
      }

      // Apply default limit
      const limit = params.limit || parseInt(process.env.DEFAULT_LIST_LIMIT || '50');
      if (limit > 500) {
        throw new Error('Limit cannot exceed 500');
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.type) queryParams.type = params.type;
      if (params.location) queryParams.location = params.location;
      if (params.license_number) queryParams.license_number = params.license_number;
      if (params.min_contracts !== undefined) queryParams.min_contracts = params.min_contracts.toString();
      if (params.max_contracts !== undefined) queryParams.max_contracts = params.max_contracts.toString();
      queryParams.limit = limit.toString();

      const response = await this.get("/api/waste-producers", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const producers = apiData.success ? apiData.data : apiData;

      // Cache the result
      this.cacheResult(params, producers);

      return this.success(producers, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
