// Swagger API Documentation Configuration
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Waste Management API",
      version: "1.0.0",
      description: "A RESTful API for managing waste management operations including shipments, facilities, contaminants, and inspections with advanced analytics.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Shipments",
        description: "Waste shipment management",
      },
      {
        name: "Facilities",
        description: "Facility management",
      },
      {
        name: "Contaminants",
        description: "Contaminant detection and tracking",
      },
      {
        name: "Inspections",
        description: "Inspection management",
      },
      {
        name: "Analytics",
        description: "Analytics and reporting endpoints",
      },
      {
        name: "Database",
        description: "Database management operations (development/testing only)",
      },
    ],
    components: {
      schemas: {
        Shipment: {
          type: "object",
          required: ["id", "facility_id", "date", "status", "weight_kg", "has_contaminants"],
          properties: {
            id: {
              type: "string",
              description: "Unique shipment identifier",
              example: "S1",
            },
            facility_id: {
              type: "string",
              description: "ID of the destination facility",
              example: "F1",
            },
            date: {
              type: "string",
              format: "date",
              description: "Shipment date (ISO 8601)",
              example: "2025-10-05",
            },
            status: {
              type: "string",
              enum: ["pending", "in_transit", "delivered", "rejected"],
              description: "Current shipment status",
              example: "delivered",
            },
            weight_kg: {
              type: "number",
              description: "Weight in kilograms",
              example: 1500,
            },
            has_contaminants: {
              type: "boolean",
              description: "Whether contaminants were detected",
              example: false,
            },
            origin: {
              type: "string",
              description: "Origin location",
              example: "Hamburg",
            },
            destination: {
              type: "string",
              description: "Destination location",
              example: "Hannover",
            },
            waste_type: {
              type: "string",
              description: "Type of waste",
              example: "plastic",
            },
            waste_code: {
              type: "string",
              description: "Waste classification code",
              example: "PL-150",
            },
            carrier: {
              type: "string",
              description: "Transport company name",
              example: "EcoTrans GmbH",
            },
            composition_notes: {
              type: "string",
              description: "Description of waste composition",
              example: "Mixed plastic waste from household collection",
            },
          },
        },
        Facility: {
          type: "object",
          required: ["id", "name", "location", "type", "capacity_tons"],
          properties: {
            id: {
              type: "string",
              description: "Unique facility identifier",
              example: "F1",
            },
            name: {
              type: "string",
              description: "Facility name",
              example: "Hannover Sorting Center",
            },
            location: {
              type: "string",
              description: "Facility location",
              example: "Hannover",
            },
            type: {
              type: "string",
              enum: ["sorting", "processing", "disposal"],
              description: "Type of facility",
              example: "sorting",
            },
            capacity_tons: {
              type: "number",
              description: "Maximum capacity in tons",
              example: 500,
            },
            current_load_tons: {
              type: "number",
              description: "Current load in tons",
              example: 320,
            },
            coordinates: {
              type: "object",
              properties: {
                lat: {
                  type: "number",
                  description: "Latitude",
                  example: 52.3759,
                },
                lon: {
                  type: "number",
                  description: "Longitude",
                  example: 9.732,
                },
              },
            },
            accepted_waste_types: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Types of waste this facility accepts",
              example: ["plastic", "metal", "paper", "glass"],
            },
            rejected_waste_types: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Types of waste this facility rejects",
              example: ["hazardous", "medical"],
            },
            contact_email: {
              type: "string",
              format: "email",
              description: "Contact email address",
              example: "info@hannover-sort.de",
            },
            contact_phone: {
              type: "string",
              description: "Contact phone number",
              example: "+49-511-123456",
            },
            operating_hours: {
              type: "string",
              description: "Operating hours",
              example: "Mon-Fri 7:00-18:00, Sat 8:00-14:00",
            },
          },
        },
        Contaminant: {
          type: "object",
          required: ["id", "shipment_id", "type", "concentration_ppm", "risk_level", "detected_at"],
          properties: {
            id: {
              type: "string",
              description: "Unique contaminant identifier",
              example: "C1",
            },
            shipment_id: {
              type: "string",
              description: "ID of the shipment where contaminant was detected",
              example: "S2",
            },
            facility_id: {
              type: "string",
              description: "ID of the facility where it was detected",
              example: "F2",
            },
            type: {
              type: "string",
              description: "Type of contaminant",
              example: "Lead",
            },
            concentration_ppm: {
              type: "number",
              description: "Concentration in parts per million",
              example: 150,
            },
            risk_level: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Risk level assessment",
              example: "high",
            },
            detected_at: {
              type: "string",
              format: "date-time",
              description: "Detection timestamp (ISO 8601)",
              example: "2025-10-06T10:30:00Z",
            },
            notes: {
              type: "string",
              description: "Additional notes",
              example: "Exceeds safety threshold",
            },
            analysis_notes: {
              type: "string",
              description: "Detailed analysis notes",
              example: "Detected via XRF analysis, consistent with industrial paint waste",
            },
            waste_item_detected: {
              type: "string",
              description: "Specific waste item detected",
              example: "Lead-based paint chips",
            },
            explosive_level: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Explosive risk level",
              example: "low",
            },
            so2_level: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Sulfur dioxide level",
              example: "low",
            },
            hcl_level: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Hydrogen chloride level",
              example: "medium",
            },
            estimated_size: {
              type: "number",
              description: "Estimated size/volume",
              example: 25.5,
            },
          },
        },
        Inspection: {
          type: "object",
          required: ["id", "shipment_id", "facility_id", "date", "status", "inspector"],
          properties: {
            id: {
              type: "string",
              description: "Unique inspection identifier",
              example: "I1",
            },
            shipment_id: {
              type: "string",
              description: "ID of the inspected shipment",
              example: "S1",
            },
            facility_id: {
              type: "string",
              description: "ID of the facility where inspection occurred",
              example: "F1",
            },
            date: {
              type: "string",
              format: "date",
              description: "Inspection date (ISO 8601)",
              example: "2025-10-05",
            },
            status: {
              type: "string",
              enum: ["accepted", "rejected", "pending"],
              description: "Inspection result status",
              example: "accepted",
            },
            inspector: {
              type: "string",
              description: "Name of the inspector",
              example: "John Doe",
            },
            notes: {
              type: "string",
              description: "Inspection notes",
              example: "Clean shipment, no issues detected",
            },
            contaminants_detected: {
              type: "array",
              items: {
                type: "string",
              },
              description: "List of detected contaminants",
              example: ["Lead", "Plastic"],
            },
            risk_assessment: {
              type: "string",
              description: "Risk assessment summary",
              example: "High risk - immediate action required",
            },
            inspection_type: {
              type: "string",
              enum: ["arrival", "processing", "departure", "random"],
              description: "Type of inspection",
              example: "arrival",
            },
            duration_minutes: {
              type: "number",
              description: "Duration of inspection in minutes",
              example: 45,
            },
            passed: {
              type: "boolean",
              description: "Quick pass/fail indicator",
              example: true,
            },
            follow_up_required: {
              type: "boolean",
              description: "Whether follow-up action is needed",
              example: false,
            },
            photos: {
              type: "array",
              items: {
                type: "string",
              },
              description: "URLs to inspection photos",
              example: ["https://storage.example.com/inspections/I1-1.jpg"],
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Resource not found",
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
          },
        },
      },
    },
    paths: {
      "/api/shipments": {
        get: {
          tags: ["Shipments"],
          summary: "List all shipments",
          description: "Get a list of all shipments with optional filtering",
          parameters: [
            {
              name: "date_from",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Filter by start date",
            },
            {
              name: "date_to",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Filter by end date",
            },
            {
              name: "facility_id",
              in: "query",
              schema: { type: "string" },
              description: "Filter by facility ID",
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["pending", "in_transit", "delivered", "rejected"] },
              description: "Filter by status",
            },
            {
              name: "has_contaminants",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by contamination status",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Shipment" },
                      },
                      count: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Shipments"],
          summary: "Create a new shipment",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Shipment" },
              },
            },
          },
          responses: {
            "201": {
              description: "Shipment created successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
          },
        },
      },
      "/api/shipments/{id}": {
        get: {
          tags: ["Shipments"],
          summary: "Get a shipment by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Shipment ID",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Shipment" },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Shipment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        put: {
          tags: ["Shipments"],
          summary: "Update a shipment",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Shipment" },
              },
            },
          },
          responses: {
            "200": {
              description: "Shipment updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Shipments"],
          summary: "Delete a shipment",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Shipment deleted successfully",
            },
          },
        },
      },
      "/api/facilities": {
        get: {
          tags: ["Facilities"],
          summary: "List all facilities",
          parameters: [
            {
              name: "location",
              in: "query",
              schema: { type: "string" },
              description: "Filter by location",
            },
            {
              name: "type",
              in: "query",
              schema: { type: "string", enum: ["sorting", "processing", "disposal"] },
              description: "Filter by facility type",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Facility" },
                      },
                      count: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Facilities"],
          summary: "Create a new facility",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Facility" },
              },
            },
          },
          responses: {
            "201": {
              description: "Facility created successfully",
            },
          },
        },
      },
      "/api/facilities/{id}": {
        get: {
          tags: ["Facilities"],
          summary: "Get a facility by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Facility" },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ["Facilities"],
          summary: "Update a facility",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Facility" },
              },
            },
          },
          responses: {
            "200": {
              description: "Facility updated successfully",
            },
          },
        },
        delete: {
          tags: ["Facilities"],
          summary: "Delete a facility",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Facility deleted successfully",
            },
          },
        },
      },
      "/api/contaminants-detected": {
        get: {
          tags: ["Contaminants"],
          summary: "List all contaminants",
          parameters: [
            {
              name: "shipment_ids",
              in: "query",
              schema: { type: "string" },
              description: "Comma-separated shipment IDs",
            },
            {
              name: "risk_level",
              in: "query",
              schema: { type: "string", enum: ["low", "medium", "high", "critical"] },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Contaminant" },
                      },
                      count: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Contaminants"],
          summary: "Create a new contaminant record",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contaminant" },
              },
            },
          },
          responses: {
            "201": {
              description: "Contaminant created successfully",
            },
          },
        },
      },
      "/api/contaminants-detected/{id}": {
        get: {
          tags: ["Contaminants"],
          summary: "Get a contaminant by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Contaminant" },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ["Contaminants"],
          summary: "Update a contaminant",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contaminant" },
              },
            },
          },
          responses: {
            "200": {
              description: "Contaminant updated successfully",
            },
          },
        },
        delete: {
          tags: ["Contaminants"],
          summary: "Delete a contaminant",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Contaminant deleted successfully",
            },
          },
        },
      },
      "/api/inspections": {
        get: {
          tags: ["Inspections"],
          summary: "List all inspections",
          parameters: [
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["accepted", "rejected", "pending"] },
            },
            {
              name: "facility_id",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Inspection" },
                      },
                      count: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Inspections"],
          summary: "Create a new inspection",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Inspection" },
              },
            },
          },
          responses: {
            "201": {
              description: "Inspection created successfully",
            },
          },
        },
      },
      "/api/inspections/{id}": {
        get: {
          tags: ["Inspections"],
          summary: "Get an inspection by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Inspection" },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ["Inspections"],
          summary: "Update an inspection",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Inspection" },
              },
            },
          },
          responses: {
            "200": {
              description: "Inspection updated successfully",
            },
          },
        },
        delete: {
          tags: ["Inspections"],
          summary: "Delete an inspection",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Inspection deleted successfully",
            },
          },
        },
      },
      "/api/analytics/contamination-rate": {
        get: {
          tags: ["Analytics"],
          summary: "Get contamination rate statistics",
          description: "Returns overall contamination statistics including rate percentage and risk level distribution",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          total_shipments: { type: "number" },
                          contaminated_shipments: { type: "number" },
                          clean_shipments: { type: "number" },
                          contamination_rate_percent: { type: "number" },
                          risk_level_distribution: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/analytics/facility-performance": {
        get: {
          tags: ["Analytics"],
          summary: "Get facility performance metrics",
          description: "Returns acceptance and rejection rates for all facilities",
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        },
      },
      "/api/analytics/waste-type-distribution": {
        get: {
          tags: ["Analytics"],
          summary: "Get waste type distribution",
          description: "Returns breakdown of shipments by waste type with contamination rates",
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        },
      },
      "/api/analytics/risk-trends": {
        get: {
          tags: ["Analytics"],
          summary: "Get contaminant risk trends over time",
          description: "Returns daily breakdown of contaminants by risk level",
          parameters: [
            {
              name: "days",
              in: "query",
              schema: { type: "number", default: 30 },
              description: "Number of days to look back",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        },
      },
      "/api/reset": {
        post: {
          tags: ["Database"],
          summary: "Reset database",
          description: "⚠️ WARNING: Deletes ALL data and reseeds with test data. Use only in development/testing!",
          responses: {
            "200": {
              description: "Database reset successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          facilities: { type: "number" },
                          shipments: { type: "number" },
                          contaminants: { type: "number" },
                          inspections: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Reset failed",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

