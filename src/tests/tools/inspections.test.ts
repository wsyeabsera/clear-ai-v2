// Unit tests for InspectionsTool
import nock from "nock";
import { InspectionsTool } from "../../tools/inspections.js";
import { mockInspections } from "../fixtures/waste-data.js";

describe("InspectionsTool", () => {
  let tool: InspectionsTool;
  const apiUrl = "https://api.wasteer.dev";

  beforeEach(() => {
    tool = new InspectionsTool(apiUrl);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should have correct tool metadata", () => {
    expect(tool.name).toBe("inspections");
    expect(tool.description).toContain("Query shipment inspections");
    expect(tool.schema.params.status).toBeDefined();
    expect(tool.schema.params.has_risk_contaminants).toBeDefined();
  });

  it("should fetch all inspections", async () => {
    nock(apiUrl).get("/inspections").query({}).reply(200, mockInspections);

    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockInspections);
    expect(result.tool).toBe("inspections");
    expect(result.metadata.executionTime).toBeGreaterThan(0);
  });

  it("should filter inspections by status", async () => {
    const rejectedInspections = mockInspections.filter(
      (i) => i.status === "rejected"
    );

    nock(apiUrl)
      .get("/inspections")
      .query({ status: "rejected" })
      .reply(200, rejectedInspections);

    const result = await tool.execute({ status: "rejected" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rejectedInspections);
    expect(result.data?.every((i: any) => i.status === "rejected")).toBe(true);
  });

  it("should filter inspections by date range", async () => {
    const filtered = mockInspections.filter(
      (i) => i.date >= "2025-10-05" && i.date <= "2025-10-07"
    );

    nock(apiUrl)
      .get("/inspections")
      .query({
        date_from: "2025-10-05",
        date_to: "2025-10-07",
      })
      .reply(200, filtered);

    const result = await tool.execute({
      date_from: "2025-10-05",
      date_to: "2025-10-07",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });

  it("should filter inspections by facility", async () => {
    const facilityInspections = mockInspections.filter(
      (i) => i.facility_id === "F1"
    );

    nock(apiUrl)
      .get("/inspections")
      .query({ facility_id: "F1" })
      .reply(200, facilityInspections);

    const result = await tool.execute({ facility_id: "F1" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(facilityInspections);
    expect(result.data?.every((i: any) => i.facility_id === "F1")).toBe(true);
  });

  it("should filter inspections by shipment", async () => {
    const shipmentInspections = mockInspections.filter(
      (i) => i.shipment_id === "S2"
    );

    nock(apiUrl)
      .get("/inspections")
      .query({ shipment_id: "S2" })
      .reply(200, shipmentInspections);

    const result = await tool.execute({ shipment_id: "S2" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(shipmentInspections);
  });

  it("should filter inspections with risk contaminants", async () => {
    const riskInspections = mockInspections.filter(
      (i) => i.contaminants_detected && i.contaminants_detected.length > 0
    );

    nock(apiUrl)
      .get("/inspections")
      .query({ has_risk_contaminants: "true" })
      .reply(200, riskInspections);

    const result = await tool.execute({ has_risk_contaminants: true });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(riskInspections);
  });

  it("should handle API errors gracefully", async () => {
    nock(apiUrl)
      .get("/inspections")
      .query(true)
      .reply(401, { error: "Unauthorized" });

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("401");
  });

  it("should handle network errors gracefully", async () => {
    nock(apiUrl)
      .get("/inspections")
      .query(true)
      .replyWithError("DNS lookup failed");

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("UNKNOWN");
    expect(result.error?.message).toContain("DNS lookup failed");
  });

  it("should get accepted inspections from this week", async () => {
    const acceptedInspections = mockInspections.filter(
      (i) => i.status === "accepted"
    );

    nock(apiUrl)
      .get("/inspections")
      .query({
        status: "accepted",
        date_from: "2025-10-04",
        date_to: "2025-10-11",
      })
      .reply(200, acceptedInspections);

    const result = await tool.execute({
      status: "accepted",
      date_from: "2025-10-04",
      date_to: "2025-10-11",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(acceptedInspections);
  });

  it("should handle multiple filters simultaneously", async () => {
    const filtered = mockInspections.filter(
      (i) =>
        i.status === "rejected" &&
        i.facility_id === "F2" &&
        i.contaminants_detected &&
        i.contaminants_detected.length > 0
    );

    nock(apiUrl)
      .get("/inspections")
      .query({
        status: "rejected",
        facility_id: "F2",
        has_risk_contaminants: "true",
      })
      .reply(200, filtered);

    const result = await tool.execute({
      status: "rejected",
      facility_id: "F2",
      has_risk_contaminants: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });
});

