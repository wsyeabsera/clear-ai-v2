// Contracts Create Tool - Create new contract
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsCreateTool extends BaseTool {
  name = "contracts_create";
  description = "Create a new contract between producer and facility";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique contract ID",
        required: true,
      },
      producer_id: {
        type: "string",
        description: "Producer ID",
        required: true,
      },
      facility_id: {
        type: "string",
        description: "Facility ID",
        required: true,
      },
      waste_types_declared: {
        type: "array",
        description: "Array of waste type codes (e.g., [\"191212\", \"150101\"])",
        required: true,
      },
      start_date: {
        type: "string",
        description: "Contract start date (ISO 8601)",
        required: true,
      },
      end_date: {
        type: "string",
        description: "Contract end date (ISO 8601)",
        required: true,
      },
      max_weight_kg: {
        type: "number",
        description: "Maximum weight in kilograms",
        required: true,
      },
      status: {
        type: "string",
        description: "Contract status (active, expired, suspended)",
        required: true,
      },
      terms: {
        type: "string",
        description: "Contract terms and conditions",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Created contract details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate enum values
      const statusValidation = this.validateEnum(
        params.status,
        ["active", "expired", "suspended"],
        "status"
      );
      if (!statusValidation.valid) {
        throw new Error(statusValidation.error);
      }

      // Validate required fields
      if (!params.id || !params.producer_id || !params.facility_id) {
        throw new Error("ID, producer_id, and facility_id are required");
      }

      if (!params.waste_types_declared || !Array.isArray(params.waste_types_declared)) {
        throw new Error("waste_types_declared must be an array");
      }

      if (!params.start_date || !params.end_date) {
        throw new Error("start_date and end_date are required");
      }

      if (!params.max_weight_kg || params.max_weight_kg <= 0) {
        throw new Error("max_weight_kg must be a positive number");
      }

      if (!params.terms) {
        throw new Error("terms are required");
      }

      const response = await this.post("/contracts", params);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const contract = apiData.success ? apiData.data : apiData;

      return this.success(contract, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
