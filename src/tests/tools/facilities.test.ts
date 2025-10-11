// Unit tests for FacilitiesTool
import nock from "nock";
import { FacilitiesTool } from "../../tools/facilities.js";
import { mockFacilities } from "../fixtures/waste-data.js";

describe("FacilitiesTool", () => {
  let tool: FacilitiesTool;
  const apiUrl = "https://api.wasteer.dev";

  beforeEach(() => {
    tool = new FacilitiesTool(apiUrl);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should have correct tool metadata", () => {
    expect(tool.name).toBe("facilities");
    expect(tool.description).toContain("Query waste management facilities");
    expect(tool.schema.params.location).toBeDefined();
    expect(tool.schema.params.type).toBeDefined();
  });

  it("should fetch all facilities", async () => {
    nock(apiUrl).get("/facilities").query({}).reply(200, mockFacilities);

    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockFacilities);
    expect(result.tool).toBe("facilities");
    expect(result.metadata.executionTime).toBeGreaterThan(0);
  });

  it("should filter facilities by location", async () => {
    const hannoverFacilities = mockFacilities.filter((f) =>
      f.location.includes("Hannover")
    );

    nock(apiUrl)
      .get("/facilities")
      .query({ location: "Hannover" })
      .reply(200, hannoverFacilities);

    const result = await tool.execute({ location: "Hannover" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(hannoverFacilities);
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].location).toBe("Hannover");
  });

  it("should filter facilities by type", async () => {
    const sortingFacilities = mockFacilities.filter(
      (f) => f.type === "sorting"
    );

    nock(apiUrl)
      .get("/facilities")
      .query({ type: "sorting" })
      .reply(200, sortingFacilities);

    const result = await tool.execute({ type: "sorting" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(sortingFacilities);
    expect(result.data?.every((f: any) => f.type === "sorting")).toBe(true);
  });

  it("should filter facilities by minimum capacity", async () => {
    const highCapacity = mockFacilities.filter((f) => f.capacity_tons >= 800);

    nock(apiUrl)
      .get("/facilities")
      .query({ min_capacity: "800" })
      .reply(200, highCapacity);

    const result = await tool.execute({ min_capacity: 800 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(highCapacity);
    expect(result.data?.every((f: any) => f.capacity_tons >= 800)).toBe(true);
  });

  it("should fetch specific facilities by IDs", async () => {
    const specificFacilities = mockFacilities.filter((f) =>
      ["F1", "F2"].includes(f.id)
    );

    nock(apiUrl)
      .get("/facilities")
      .query({ ids: "F1,F2" })
      .reply(200, specificFacilities);

    const result = await tool.execute({ facility_ids: ["F1", "F2"] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(specificFacilities);
    expect(result.data?.length).toBe(2);
  });

  it("should handle API errors gracefully", async () => {
    nock(apiUrl)
      .get("/facilities")
      .query(true)
      .reply(404, { error: "Not Found" });

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("404");
  });

  it("should handle network errors gracefully", async () => {
    nock(apiUrl)
      .get("/facilities")
      .query(true)
      .replyWithError("Connection timeout");

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("UNKNOWN");
    expect(result.error?.message).toContain("Connection timeout");
  });

  it("should handle multiple filters simultaneously", async () => {
    const filtered = mockFacilities.filter(
      (f) => f.type === "processing" && f.capacity_tons >= 1000
    );

    nock(apiUrl)
      .get("/facilities")
      .query({ type: "processing", min_capacity: "1000" })
      .reply(200, filtered);

    const result = await tool.execute({
      type: "processing",
      min_capacity: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(filtered);
  });
});

