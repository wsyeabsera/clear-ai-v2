// Unit tests for ShipmentsTool
import nock from "nock";
import { ShipmentsTool } from "../../tools/shipments.js";
import { mockShipments } from "../fixtures/waste-data.js";

describe("ShipmentsTool", () => {
  let tool: ShipmentsTool;
  const apiUrl = "http://localhost:4000";

  beforeEach(() => {
    tool = new ShipmentsTool(apiUrl);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should have correct tool metadata", () => {
    expect(tool.name).toBe("shipments");
    expect(tool.description).toContain("Query shipments");
    expect(tool.schema.params.date_from).toBeDefined();
    expect(tool.schema.params.has_contaminants).toBeDefined();
  });

  it("should fetch all shipments with default limit", async () => {
    nock(apiUrl)
      .get("/shipments")
      .query({ limit: "100" })
      .reply(200, mockShipments);

    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockShipments);
    expect(result.tool).toBe("shipments");
    expect(result.metadata.executionTime).toBeGreaterThan(0);
    expect(result.metadata.timestamp).toBeDefined();
  });

  it("should fetch shipments with date filter", async () => {
    const filtered = mockShipments.filter(
      (s) => s.date >= "2025-10-04" && s.date <= "2025-10-11"
    );

    nock(apiUrl)
      .get("/shipments")
      .query({
        date_from: "2025-10-04",
        date_to: "2025-10-11",
        limit: "100",
      })
      .reply(200, filtered);

    const result = await tool.execute({
      date_from: "2025-10-04",
      date_to: "2025-10-11",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });

  it("should filter shipments with contaminants", async () => {
    const contaminated = mockShipments.filter((s) => s.has_contaminants);

    nock(apiUrl)
      .get("/shipments")
      .query({ has_contaminants: "true", limit: "100" })
      .reply(200, contaminated);

    const result = await tool.execute({ has_contaminants: true });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(contaminated);
    expect(result.data?.every((s: any) => s.has_contaminants)).toBe(true);
  });

  it("should filter shipments by facility", async () => {
    const facilityShipments = mockShipments.filter(
      (s) => s.facility_id === "F1"
    );

    nock(apiUrl)
      .get("/shipments")
      .query({ facility_id: "F1", limit: "100" })
      .reply(200, facilityShipments);

    const result = await tool.execute({ facility_id: "F1" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(facilityShipments);
  });

  it("should filter shipments by status", async () => {
    const deliveredShipments = mockShipments.filter(
      (s) => s.status === "delivered"
    );

    nock(apiUrl)
      .get("/shipments")
      .query({ status: "delivered", limit: "100" })
      .reply(200, deliveredShipments);

    const result = await tool.execute({ status: "delivered" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(deliveredShipments);
  });

  it("should handle custom limit parameter", async () => {
    nock(apiUrl)
      .get("/shipments")
      .query({ limit: "10" })
      .reply(200, mockShipments.slice(0, 2));

    const result = await tool.execute({ limit: 10 });

    expect(result.success).toBe(true);
    expect(result.data?.length).toBeLessThanOrEqual(10);
  });

  it("should handle API errors gracefully", async () => {
    nock(apiUrl)
      .get("/shipments")
      .query(true)
      .reply(500, { error: "Internal Server Error" });

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("500");
    expect(result.error?.message).toBeDefined();
    expect(result.tool).toBe("shipments");
  });

  it("should handle network errors gracefully", async () => {
    nock(apiUrl)
      .get("/shipments")
      .query(true)
      .replyWithError("Network error");

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("UNKNOWN");
    expect(result.error?.message).toContain("Network error");
  });

  it("should handle multiple filters simultaneously", async () => {
    const filtered = mockShipments.filter(
      (s) =>
        s.has_contaminants &&
        s.date >= "2025-10-04" &&
        s.facility_id === "F2"
    );

    nock(apiUrl)
      .get("/shipments")
      .query({
        has_contaminants: "true",
        date_from: "2025-10-04",
        facility_id: "F2",
        limit: "100",
      })
      .reply(200, filtered);

    const result = await tool.execute({
      has_contaminants: true,
      date_from: "2025-10-04",
      facility_id: "F2",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });
});

