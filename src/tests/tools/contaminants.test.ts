// Unit tests for ContaminantsTool
import nock from "nock";
import { ContaminantsTool } from "../../tools/contaminants.js";
import { mockContaminants } from "../fixtures/waste-data.js";

describe("ContaminantsTool", () => {
  let tool: ContaminantsTool;
  const apiUrl = "http://localhost:4000";

  beforeEach(() => {
    tool = new ContaminantsTool(apiUrl);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should have correct tool metadata", () => {
    expect(tool.name).toBe("contaminants-detected");
    expect(tool.description).toContain("Query detected contaminants");
    expect(tool.schema.params.shipment_ids).toBeDefined();
    expect(tool.schema.params.risk_level).toBeDefined();
  });

  it("should fetch all contaminants", async () => {
    nock(apiUrl)
      .get("/contaminants-detected")
      .query({})
      .reply(200, mockContaminants);

    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockContaminants);
    expect(result.tool).toBe("contaminants-detected");
    expect(result.metadata.executionTime).toBeGreaterThan(0);
  });

  it("should filter contaminants by shipment IDs", async () => {
    const shipmentContaminants = mockContaminants.filter((c) =>
      ["S2"].includes(c.shipment_id)
    );

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({ shipment_ids: "S2" })
      .reply(200, shipmentContaminants);

    const result = await tool.execute({ shipment_ids: ["S2"] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(shipmentContaminants);
    expect(result.data?.every((c: any) => c.shipment_id === "S2")).toBe(true);
  });

  it("should filter contaminants by facility", async () => {
    const facilityContaminants = mockContaminants.filter(
      (c) => c.facility_id === "F2"
    );

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({ facility_id: "F2" })
      .reply(200, facilityContaminants);

    const result = await tool.execute({ facility_id: "F2" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(facilityContaminants);
  });

  it("should filter contaminants by date range", async () => {
    const dateFiltered = mockContaminants.filter(
      (c) =>
        c.detected_at >= "2025-10-06T00:00:00Z" &&
        c.detected_at <= "2025-10-07T00:00:00Z"
    );

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({
        date_from: "2025-10-06",
        date_to: "2025-10-07",
      })
      .reply(200, dateFiltered);

    const result = await tool.execute({
      date_from: "2025-10-06",
      date_to: "2025-10-07",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(dateFiltered);
  });

  it("should filter contaminants by type", async () => {
    const leadContaminants = mockContaminants.filter((c) => c.type === "Lead");

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({ type: "Lead" })
      .reply(200, leadContaminants);

    const result = await tool.execute({ contaminant_type: "Lead" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(leadContaminants);
    expect(result.data?.every((c: any) => c.type === "Lead")).toBe(true);
  });

  it("should filter contaminants by risk level", async () => {
    const highRisk = mockContaminants.filter((c) => c.risk_level === "high");

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({ risk_level: "high" })
      .reply(200, highRisk);

    const result = await tool.execute({ risk_level: "high" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(highRisk);
    expect(result.data?.every((c: any) => c.risk_level === "high")).toBe(true);
  });

  it("should handle API errors gracefully", async () => {
    nock(apiUrl)
      .get("/contaminants-detected")
      .query(true)
      .reply(503, { error: "Service Unavailable" });

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("503");
  });

  it("should handle network errors gracefully", async () => {
    nock(apiUrl)
      .get("/contaminants-detected")
      .query(true)
      .replyWithError("Request failed");

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("UNKNOWN");
  });

  it("should handle multiple shipment IDs", async () => {
    const multipleShipments = mockContaminants.filter((c) =>
      ["S2", "S4"].includes(c.shipment_id)
    );

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({ shipment_ids: "S2,S4" })
      .reply(200, multipleShipments);

    const result = await tool.execute({ shipment_ids: ["S2", "S4"] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(multipleShipments);
    expect(result.data?.length).toBe(mockContaminants.length);
  });

  it("should handle complex filters", async () => {
    const filtered = mockContaminants.filter(
      (c) => c.facility_id === "F2" && c.risk_level === "high"
    );

    nock(apiUrl)
      .get("/contaminants-detected")
      .query({
        facility_id: "F2",
        risk_level: "high",
      })
      .reply(200, filtered);

    const result = await tool.execute({
      facility_id: "F2",
      risk_level: "high",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });
});

