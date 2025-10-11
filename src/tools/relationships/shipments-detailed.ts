// Shipments Detailed - Flexible Relationship Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ShipmentsDetailedTool extends BaseTool {
  name = "shipments_get_detailed";
  description = "Get a shipment with optionally included related data (contaminants, inspection, facility)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment ID",
        required: true,
      },
      include: {
        type: "array",
        description: "Array of relations to include: 'contaminants', 'inspection', 'facility'",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Shipment with requested related data",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      // Get shipment
      const shipmentResponse = await this.get(`/shipments/${params.id}`);
      const result: any = { ...shipmentResponse.data };

      const include = params.include || [];

      // Fetch related data based on include array
      if (include.includes("contaminants")) {
        const contaminantsResponse = await this.get("/contaminants-detected", {
          shipment_ids: params.id,
        });
        result.contaminants = contaminantsResponse.data?.data || [];
      }

      if (include.includes("inspection")) {
        const inspectionsResponse = await this.get("/inspections", {
          shipment_id: params.id,
        });
        result.inspections = inspectionsResponse.data?.data || [];
      }

      if (include.includes("facility") && result.data?.facility_id) {
        const facilityResponse = await this.get(`/facilities/${result.data.facility_id}`);
        result.facility = facilityResponse.data?.data || null;
      }

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

