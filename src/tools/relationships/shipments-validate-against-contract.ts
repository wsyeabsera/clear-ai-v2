// Shipments Validate Against Contract Tool - Validate shipment against contract terms
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentsValidateAgainstContractTool extends BaseTool {
  name = "shipments_validate_against_contract";
  description = "Validate if a shipment matches the contract terms for its producer";

  schema = {
    params: {
      shipment_id: {
        type: "string",
        description: "Shipment ID to validate",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Validation result with compliance details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.shipment_id) {
        throw new Error("Shipment ID is required");
      }

      // Get shipment details
      const shipmentResponse = await this.get(`/shipments/${params.shipment_id}`);
      const shipmentData = shipmentResponse.data as any;
      
      if (!shipmentData.success) {
        throw new Error("Shipment not found");
      }

      const shipment = shipmentData.data;

      // Get shipment loads to check detected waste codes
      const loadsResponse = await this.get("/api/shipment-loads", { shipment_id: shipment.id });
      const loadsData = loadsResponse.data as any;
      const loads = loadsData.success ? loadsData.data : [];

      // Get contracts for the facility
      const contractsResponse = await this.get("/api/contracts", { facility_id: shipment.facility_id, status: "active" });
      const contractsData = contractsResponse.data as any;
      const contracts = contractsData.success ? contractsData.data : [];

      // Analyze compliance
      const validation = {
        shipment_id: shipment.id,
        facility_id: shipment.facility_id,
        contracts_found: contracts.length,
        loads_analyzed: loads.length,
        compliance_status: "unknown" as string,
        violations: [] as string[],
        matches: [] as any[],
        recommendations: [] as string[]
      };

      if (contracts.length === 0) {
        validation.compliance_status = "no_contract";
        validation.violations.push("No active contracts found for this facility");
        validation.recommendations.push("Create an active contract for this facility");
      } else {
        // Check each load against contract terms
        for (const load of loads) {
          const detectedCodes = load.waste_codes_detected || [];
          let loadCompliant = false;
          
          for (const contract of contracts) {
            const declaredCodes = contract.waste_types_declared || [];
            
            // Check if any detected code is in declared codes
            const matchingCodes = detectedCodes.filter((code: string) => declaredCodes.includes(code));
            
            if (matchingCodes.length > 0) {
              loadCompliant = true;
              validation.matches.push({
                load_id: load.id,
                contract_id: contract.id,
                matching_codes: matchingCodes
              });
            }
          }
          
          if (!loadCompliant) {
            validation.violations.push(`Load ${load.id} contains undeclared waste codes: ${detectedCodes.join(", ")}`);
          }
        }
        
        validation.compliance_status = validation.violations.length === 0 ? "compliant" : "non_compliant";
      }

      return this.success(validation, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
