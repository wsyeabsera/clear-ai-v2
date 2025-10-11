// Inspections Detailed - Relationship Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class InspectionsDetailedTool extends BaseTool {
  name = "inspections_get_detailed";
  description = "Get an inspection with full shipment data, facility data, and contaminants found";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Inspection ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Inspection with full context",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      // Get inspection
      const inspectionResponse = await this.get(`/inspections/${params.id}`);
      const inspection = inspectionResponse.data;
      const result: any = { ...inspection };

      // Get shipment details
      if (result.data?.shipment_id) {
        const shipmentResponse = await this.get(`/shipments/${result.data.shipment_id}`);
        result.data.shipment_details = shipmentResponse.data?.data || null;

        // Get contaminants for this shipment
        const contaminantsResponse = await this.get("/contaminants-detected", {
          shipment_ids: result.data.shipment_id,
        });
        result.data.contaminants_found = contaminantsResponse.data?.data || [];
      }

      // Get facility details
      if (result.data?.facility_id) {
        const facilityResponse = await this.get(`/facilities/${result.data.facility_id}`);
        result.data.facility_details = facilityResponse.data?.data || null;
      }

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

