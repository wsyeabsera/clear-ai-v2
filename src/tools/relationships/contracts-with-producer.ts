// Contracts with Producer Tool - Get contract with producer details
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsWithProducerTool extends BaseTool {
  name = "contracts_get_with_producer";
  description = "Get contract details with producer information included";

  schema = {
    params: {
      contract_id: {
        type: "string",
        description: "Contract ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Contract details with producer information",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.contract_id) {
        throw new Error("Contract ID is required");
      }

      // Get contract details
      const contractResponse = await this.get(`/contracts/${params.contract_id}`);
      const contractData = contractResponse.data as any;
      
      if (!contractData.success) {
        throw new Error("Contract not found");
      }

      const contract = contractData.data;

      // Get producer details
      const producerResponse = await this.get(`/waste-producers/${contract.producer_id}`);
      const producerData = producerResponse.data as any;
      
      const result = {
        contract,
        producer: producerData.success ? producerData.data : null,
        producer_found: producerData.success
      };

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
