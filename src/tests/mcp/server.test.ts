// Unit tests for MCP Server
import { MCPServer } from "../../mcp/server.js";
import { ShipmentsTool } from "../../tools/shipments.js";
import { FacilitiesTool } from "../../tools/facilities.js";

describe("MCPServer", () => {
  let server: MCPServer;
  const apiUrl = "http://localhost:4000";

  beforeEach(() => {
    server = new MCPServer("clear-ai-v2", "1.0.0");
  });

  it("should create a server instance", () => {
    expect(server).toBeDefined();
    expect(server.getToolCount()).toBe(0);
  });

  it("should register a tool", () => {
    const shipmentsTool = new ShipmentsTool(apiUrl);
    server.registerTool(shipmentsTool);

    expect(server.getToolCount()).toBe(1);
    expect(server.getTool("shipments")).toBeDefined();
    expect(server.getTool("shipments")?.name).toBe("shipments");
  });

  it("should register multiple tools", () => {
    const shipmentsTool = new ShipmentsTool(apiUrl);
    const facilitiesTool = new FacilitiesTool(apiUrl);

    server.registerTool(shipmentsTool);
    server.registerTool(facilitiesTool);

    expect(server.getToolCount()).toBe(2);
    expect(server.getTool("shipments")).toBeDefined();
    expect(server.getTool("facilities")).toBeDefined();
  });

  it("should retrieve registered tool by name", () => {
    const shipmentsTool = new ShipmentsTool(apiUrl);
    server.registerTool(shipmentsTool);

    const retrieved = server.getTool("shipments");
    expect(retrieved).toBe(shipmentsTool);
  });

  it("should return undefined for non-existent tool", () => {
    const tool = server.getTool("non-existent");
    expect(tool).toBeUndefined();
  });

  it("should handle tool replacement", () => {
    const tool1 = new ShipmentsTool(apiUrl);
    const tool2 = new ShipmentsTool("https://api2.wasteer.dev");

    server.registerTool(tool1);
    expect(server.getToolCount()).toBe(1);

    server.registerTool(tool2);
    expect(server.getToolCount()).toBe(1); // Still 1, replaced

    const retrieved = server.getTool("shipments");
    expect(retrieved).toBe(tool2);
  });
});

