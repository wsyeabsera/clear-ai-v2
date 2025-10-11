// Facilities Detailed - Flexible Relationship Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class FacilitiesDetailedTool extends BaseTool {
  name = "facilities_get_detailed";
  description = "Get a facility with optionally included related data (shipments, inspections, contaminants)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Facility ID",
        required: true,
      },
      include: {
        type: "array",
        description: "Array of relations: 'shipments', 'inspections', 'contaminants'",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Facility with requested related data",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      // Get facility
      const facilityResponse = await this.get(`/facilities/${params.id}`);
      const result: any = { ...facilityResponse.data };

      const include = params.include || [];

      if (include.includes("shipments")) {
        const shipmentsResponse = await this.get("/shipments", {
          facility_id: params.id,
        });
        result.data.shipments = shipmentsResponse.data?.data || [];
      }

      if (include.includes("inspections")) {
        const inspectionsResponse = await this.get("/inspections", {
          facility_id: params.id,
        });
        result.data.inspections = inspectionsResponse.data?.data || [];
      }

      if (include.includes("contaminants")) {
        const contaminantsResponse = await this.get("/contaminants-detected", {
          facility_id: params.id,
        });
        result.data.contaminants = contaminantsResponse.data?.data || [];
      }

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

