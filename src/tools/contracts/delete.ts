// Contracts Delete Tool - Delete contract
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsDeleteTool extends BaseTool {
  name = "contracts_delete";
  description = "Delete a contract by ID";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contract ID to delete",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Deletion confirmation",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Contract ID is required");
      }

      const response = await this.delete(`/contracts/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const result = apiData.success ? apiData : { success: true, message: "Contract deleted successfully" };

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
