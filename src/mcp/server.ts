// MCP Server implementation
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MCPTool, ToolSchema } from "../shared/types/tool.js";

export class MCPServer {
  private server: Server;
  private tools: Map<string, MCPTool>;

  constructor(name: string, version: string) {
    this.server = new Server(
      {
        name,
        version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.tools = new Map();
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  async start(): Promise<void> {
    // Setup tool handlers
    this.setupHandlers();

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(`MCP Server started with ${this.tools.size} tools`);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: this.convertSchemaToJSON(tool.schema),
        })),
      };
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      const result = await tool.execute(args || {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private convertSchemaToJSON(schema: ToolSchema): any {
    // Convert internal schema to JSON Schema format
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.params)) {
      properties[key] = {
        type: value.type,
        description: value.description,
      };
      if (value.default !== undefined) {
        properties[key].default = value.default;
      }
      if (value.required) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  // Helper method for testing
  getToolCount(): number {
    return this.tools.size;
  }

  // Helper method for testing
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }
}

