# Testing MCP Tools - Complete Guide

## ✅ Implementation Complete

**Total Tools**: 29 comprehensive MCP tools  
**API Server**: Running at http://localhost:4000  
**Swagger UI**: http://localhost:4000/api-docs

## Tool Breakdown

### CRUD Operations (20 tools)
- **Shipments**: 5 tools (list, get, create, update, delete)
- **Facilities**: 5 tools (list, get, create, update, delete)
- **Contaminants**: 5 tools (list, get, create, update, delete)
- **Inspections**: 5 tools (list, get, create, update, delete)

### Analytics (4 tools)
- `analytics_contamination_rate`
- `analytics_facility_performance`
- `analytics_waste_distribution`
- `analytics_risk_trends`

### Relationships (5 tools)
- `shipments_get_with_contaminants`
- `shipments_get_detailed`
- `facilities_get_with_activity`
- `facilities_get_detailed`
- `inspections_get_detailed`

## Testing Methods

### Method 1: Test in Terminal (Quick Verification)

Start the MCP server and test tools directly:

```bash
# Start MCP server (in a new terminal)
cd /Users/yab/Projects/clear-ai-v2
yarn dev

# The MCP server will connect to the API at localhost:4000
```

### Method 2: Test in Cursor (Recommended)

The MCP tools are automatically available in Cursor when you have the MCP server configured in your Cursor settings.

#### Step 1: Configure MCP in Cursor Settings

Add to your Cursor MCP configuration (`~/.cursor/config.json` or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "node",
      "args": ["/Users/yab/Projects/clear-ai-v2/dist/main.js"],
      "env": {
        "API_BASE_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

#### Step 2: Restart Cursor

After adding the configuration, restart Cursor for it to load the MCP tools.

#### Step 3: Start Using Tools in Chat

Open Cursor AI chat and try natural language queries:

**Example Queries:**

1. **"List all shipments"**
   - Cursor will use `shipments_list` tool

2. **"Get shipment S1"**
   - Uses `shipments_get` tool

3. **"Show me shipment S2 with all its contaminants"**
   - Uses `shipments_get_with_contaminants` tool

4. **"What's the contamination rate?"**
   - Uses `analytics_contamination_rate` tool

5. **"Show facility F1 activity for the last 7 days"**
   - Uses `facilities_get_with_activity` tool with days parameter

6. **"Get all high-risk contaminants"**
   - Uses `contaminants_list` with risk_level filter

7. **"Create a new shipment for facility F1"**
   - Uses `shipments_create` tool (will ask for required fields)

### Method 3: Manual Tool Testing (Developer Mode)

For direct tool testing without Cursor integration:

```typescript
// Example test script
import { ShipmentsListTool } from './dist/tools/shipments/list.js';

const tool = new ShipmentsListTool('http://localhost:4000/api');
const result = await tool.execute({ has_contaminants: true });
console.log(result);
```

## Quick Test Commands for Cursor

Copy and paste these into Cursor chat to test different tools:

### Basic Queries
```
List all shipments
```

```
Show me all facilities
```

```
Get all contaminants with high risk level
```

### Relationship Queries
```
Get shipment S2 with its contaminants
```

```
Show facility F1 with recent activity
```

```
Get detailed information for inspection I2
```

### Analytics
```
What's the overall contamination rate?
```

```
Show facility performance metrics
```

```
What's the waste type distribution?
```

```
Show contamination risk trends for the last 7 days
```

### CRUD Operations
```
Create a new shipment with ID S99 for facility F1, waste type plastic, weight 1000kg, status pending
```

```
Update shipment S3 status to delivered
```

```
Delete shipment S99
```

## Expected Responses

### List Tool Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "data": [/* array of items */],
    "count": 12
  },
  "metadata": {
    "tool": "shipments_list",
    "executionTime": 45,
    "timestamp": "2025-10-11T18:00:00.000Z"
  }
}
```

### Get Tool Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "data": {/* single item */}
  },
  "metadata": {
    "tool": "shipments_get",
    "executionTime": 32,
    "timestamp": "2025-10-11T18:00:00.000Z"
  }
}
```

### Analytics Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "data": {
      "total_shipments": 12,
      "contamination_rate_percent": 33.33,
      /* ...other stats */
    }
  },
  "metadata": {
    "tool": "analytics_contamination_rate",
    "executionTime": 67,
    "timestamp": "2025-10-11T18:00:00.000Z"
  }
}
```

### Relationship Tool Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "data": {
      "id": "S2",
      /* shipment fields */
    },
    "contaminants": [/* array of contaminants */]
  },
  "metadata": {
    "tool": "shipments_get_with_contaminants",
    "executionTime": 89,
    "timestamp": "2025-10-11T18:00:00.000Z"
  }
}
```

## Troubleshooting

### Tools Not Showing in Cursor
1. Check MCP configuration in Cursor settings
2. Restart Cursor after adding configuration
3. Verify API server is running: `curl http://localhost:4000/health`

### Tool Execution Errors
1. **"Connection refused"**: API server not running
   ```bash
   cd /Users/yab/Projects/clear-ai-v2
   yarn api:dev
   ```

2. **"MongoDB connection error"**: MongoDB not running
   ```bash
   brew services start mongodb-community
   ```

3. **"Validation error"**: Missing required fields
   - Check tool schema for required parameters
   - Provide all required fields

### View Tool Output
Check MCP server logs for detailed tool execution information.

## Advanced Usage

### Chaining Tools
Cursor can intelligently chain multiple tools:

**Query:** "Find all facilities in Berlin, then show me their inspections"
1. Uses `facilities_list` with location filter
2. Uses `inspections_list` for each facility found

### Conditional Logic
**Query:** "If shipment S1 has contaminants, show me the detailed analysis"
1. Uses `shipments_get` to check
2. If has_contaminants is true, uses `shipments_get_with_contaminants`

### Creating Complete Workflows
**Query:** "Create a shipment, then create an inspection for it, then analyze contamination"
1. `shipments_create`
2. `inspections_create`
3. `analytics_contamination_rate`

## Sample Test Data

### Available Shipments
- S1-S12 (4 have contaminants)

### Available Facilities  
- F1-F10 (sorting, processing, disposal types)

### Available Contaminants
- C1-C8 (various risk levels and chemical compositions)

### Available Inspections
- I1-I12 (mix of accepted, rejected, pending)

## Tool Capabilities Summary

| Operation | Shipments | Facilities | Contaminants | Inspections |
|-----------|-----------|------------|--------------|-------------|
| List/Query | ✅ | ✅ | ✅ | ✅ |
| Get by ID | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | ✅ | ✅ |
| Delete | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ (via analytics tools) | ✅ (via analytics tools) | ✅ (via analytics tools) | - |
| Relationships | ✅ (2 tools) | ✅ (2 tools) | ✅ (via shipment tools) | ✅ (1 tool) |

---

**Ready to test! The API server is running and all 29 MCP tools are available.** 🎉

