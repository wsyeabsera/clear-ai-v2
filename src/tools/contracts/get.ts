// Contracts Get Tool - Get single contract by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsGetTool extends BaseTool {
  name = "contracts_get";
  description = "Get a single contract by ID with all details";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contract ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Contract details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Contract ID is required");
      }

      const response = await this.get(`/contracts/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const contract = apiData.success ? apiData.data : apiData;

      return this.success(contract, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
