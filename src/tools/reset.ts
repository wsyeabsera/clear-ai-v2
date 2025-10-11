// MCP Tool for database reset
import { BaseTool } from "./base-tool.js";
import { ToolResult } from "./types.js";

export class DatabaseResetTool extends BaseTool {
  name = "database_reset";
  description = "⚠️ Reset database - deletes ALL data and reseeds with test data. Use only for development/testing!";
  
  schema = {
    params: {},
    returns: {
      type: "object",
      description: "Database reset summary with counts of seeded records",
    },
  };

  async execute(_params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const response = await this.post("/reset", {});

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
