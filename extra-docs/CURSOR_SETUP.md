# Cursor MCP Setup Guide

## ✅ Verification: MCP Server Works!

Your MCP server is working correctly:
- ✅ Compiles successfully
- ✅ Registers 29 tools
- ✅ Connects to API at http://localhost:4000/api

## 🔧 Configure Cursor to Use MCP Tools

### Step 1: Open Cursor Settings

1. Open Cursor
2. Press `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
3. Or go to: **Cursor → Settings → Features → Model Context Protocol**

### Step 2: Find MCP Configuration

Look for the **"MCP Servers"** section or **"Model Context Protocol"** settings.

You should see a JSON editor or an "Edit in settings.json" option.

### Step 3: Add Configuration

**Option A: If you see a JSON editor in settings:**

Add this configuration:

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "node",
      "args": [
        "/Users/yab/Projects/clear-ai-v2/dist/main.js"
      ],
      "env": {
        "WASTEER_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

**Option B: If you need to edit settings.json directly:**

1. Click "Edit in settings.json" or similar
2. Add the MCP configuration to your settings
3. The file is usually at: `~/Library/Application Support/Cursor/User/settings.json`

Add this section (merge with existing JSON if needed):

```json
{
  "mcp.servers": {
    "waste-management": {
      "command": "node",
      "args": ["/Users/yab/Projects/clear-ai-v2/dist/main.js"],
      "env": {
        "WASTEER_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

### Step 4: Restart Cursor

**Important:** After adding the configuration:
1. Quit Cursor completely (`Cmd + Q`)
2. Restart Cursor
3. Wait ~5 seconds for MCP to initialize

### Step 5: Verify Tools Are Loaded

1. Open Cursor AI chat
2. Look for MCP tools indicator (usually a tools icon or "MCP" badge)
3. Try typing: "List available tools" or "Show MCP tools"
4. You should see 29 waste management tools

### Step 6: Make Sure API Server is Running

Before using the tools, ensure the API server is running:

```bash
cd /Users/yab/Projects/clear-ai-v2
yarn api:dev
```

Keep this running in a separate terminal while using Cursor.

## 🐛 Troubleshooting

### Issue: "No tools, prompts, or resources"

**Possible causes and fixes:**

1. **MCP server path incorrect**
   - Verify the path: `/Users/yab/Projects/clear-ai-v2/dist/main.js`
   - Run: `ls -la /Users/yab/Projects/clear-ai-v2/dist/main.js`
   - Should show the file exists

2. **Cursor hasn't restarted**
   - Completely quit Cursor (`Cmd + Q`)
   - Restart it
   - Wait for MCP to initialize

3. **Wrong configuration key**
   - Try both `"mcpServers"` and `"mcp.servers"`
   - Different Cursor versions use different keys

4. **Node.js not in PATH**
   - Test: `which node` (should show path to node)
   - If not found, use full path: `/usr/local/bin/node` or wherever node is installed

5. **Permissions issue**
   - Make sure main.js is executable:
     ```bash
     chmod +x /Users/yab/Projects/clear-ai-v2/dist/main.js
     ```

### Check MCP Server Logs

Cursor usually creates MCP server logs. Look for them in:
- `~/Library/Application Support/Cursor/logs/`
- Or check Cursor's Developer Tools: `Help → Toggle Developer Tools → Console`

### Manual Test

Test the MCP server manually:

```bash
cd /Users/yab/Projects/clear-ai-v2

# Make sure API is running
yarn api:dev &

# Start MCP server
yarn dev
```

You should see:
```
Starting MCP Server...
API Base URL: http://localhost:4000/api
✓ Registered 29 comprehensive waste management tools:
  - 20 CRUD operations
  - 4 Analytics tools
  - 5 Relationship tools
MCP Server started with 29 tools
✓ MCP Server is ready
```

If you see this, the server works. The issue is just Cursor configuration.

## 📋 Alternative Configuration Formats

Try these different configuration formats depending on your Cursor version:

### Format 1 (Latest Cursor)
```json
{
  "mcpServers": {
    "waste-management": {
      "command": "node",
      "args": ["/Users/yab/Projects/clear-ai-v2/dist/main.js"]
    }
  }
}
```

### Format 2 (Some Cursor versions)
```json
{
  "mcp.servers": {
    "waste-management": {
      "command": "node",
      "args": ["/Users/yab/Projects/clear-ai-v2/dist/main.js"]
    }
  }
}
```

### Format 3 (Older format)
```json
{
  "mcp": {
    "servers": {
      "waste-management": {
        "command": "node",
        "args": ["/Users/yab/Projects/clear-ai-v2/dist/main.js"]
      }
    }
  }
}
```

## ✅ Once Working

When tools load successfully, you'll be able to:

1. **Query data naturally:**
   - "Show me all contaminated shipments"
   - "Get facility F1 details"
   - "What's the contamination rate?"

2. **Create/Update:**
   - "Create a new shipment for facility F1"
   - "Update shipment S1 status to delivered"

3. **Analytics:**
   - "Show waste type distribution"
   - "Get risk trends for last 7 days"

4. **Relationships:**
   - "Get shipment S2 with all its contaminants"
   - "Show facility F1 activity for last 30 days"

## 🆘 Still Not Working?

Share:
1. Your Cursor version (Help → About)
2. Your exact MCP configuration JSON
3. Any error messages from Cursor logs/console
4. Output of: `node /Users/yab/Projects/clear-ai-v2/dist/main.js` (should start and wait for stdio)


