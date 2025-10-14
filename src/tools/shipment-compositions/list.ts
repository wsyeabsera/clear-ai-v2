// Shipment Compositions List Tool - Query shipment compositions with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentCompositionsListTool extends BaseTool {
  name = "shipment_compositions_list";
  description = "Query shipment compositions with filters for shipment, waste code, and detection method";

  schema = {
    params: {
      shipment_id: {
        type: "string",
        description: "Filter by shipment ID",
        required: false,
      },
      waste_code: {
        type: "string",
        description: "Filter by waste code (e.g., 191212, 150101)",
        required: false,
      },
      detected_by: {
        type: "string",
        description: "Detection method (camera, manual, sensor)",
        required: false,
      },
      min_confidence: {
        type: "number",
        description: "Minimum confidence level (0-1)",
        required: false,
      },
      max_confidence: {
        type: "number",
        description: "Maximum confidence level (0-1)",
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
      description: "List of shipment compositions matching the criteria",
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
      if (params.detected_by) {
        const detectedByValidation = this.validateEnum(
          params.detected_by,
          ["camera", "manual", "sensor"],
          "detected_by"
        );
        if (!detectedByValidation.valid) {
          throw new Error(detectedByValidation.error);
        }
      }

      // Validate confidence range
      if (params.min_confidence !== undefined && (params.min_confidence < 0 || params.min_confidence > 1)) {
        throw new Error("min_confidence must be between 0 and 1");
      }
      if (params.max_confidence !== undefined && (params.max_confidence < 0 || params.max_confidence > 1)) {
        throw new Error("max_confidence must be between 0 and 1");
      }

      // Apply default limit
      const limit = params.limit || parseInt(process.env.DEFAULT_LIST_LIMIT || '50');
      if (limit > 500) {
        throw new Error('Limit cannot exceed 500');
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.shipment_id) queryParams.shipment_id = params.shipment_id;
      if (params.waste_code) queryParams.waste_code = params.waste_code;
      if (params.detected_by) queryParams.detected_by = params.detected_by;
      if (params.min_confidence !== undefined) queryParams.min_confidence = params.min_confidence.toString();
      if (params.max_confidence !== undefined) queryParams.max_confidence = params.max_confidence.toString();
      queryParams.limit = limit.toString();

      const response = await this.get("/shipment-compositions", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const compositions = apiData.success ? apiData.data : apiData;

      // Cache the result
      this.cacheResult(params, compositions);

      return this.success(compositions, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
