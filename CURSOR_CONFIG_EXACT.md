# Exact Cursor MCP Configuration

## ✅ MCP Server Verified Working

The MCP server starts correctly and returns **29 tools**:
- 20 CRUD operations  
- 4 Analytics tools
- 5 Relationship tools

## 📋 Copy This Exact Configuration

### Step 1: Open Cursor Settings

**Mac**: Press `Cmd + Shift + P` → Type "Preferences: Open User Settings (JSON)"  
**Or**: Cursor → Settings → Search for "MCP" → Click "Edit in settings.json"

### Step 2: Add This Configuration

**IMPORTANT**: Make sure to copy the **FULL ABSOLUTE PATH** to yarn!

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/.nvm/versions/node/v22.19.0/bin/yarn",
      "args": [
        "node",
        "/Users/yab/Projects/clear-ai-v2/dist/main.js"
      ],
      "cwd": "/Users/yab/Projects/clear-ai-v2",
      "env": {
        "WASTEER_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

### Step 3: Before Starting Cursor

**CRITICAL**: Make sure the API server is running!

```bash
# Terminal 1: Start API server (keep this running)
cd /Users/yab/Projects/clear-ai-v2
yarn api:dev
```

### Step 4: Restart Cursor

1. **Completely quit** Cursor (`Cmd + Q` on Mac)
2. **Wait 3 seconds**
3. **Restart** Cursor
4. **Wait ~5-10 seconds** for MCP to initialize

### Step 5: Verify Tools Loaded

1. Open Cursor AI chat (Cmd + L)
2. Type: **"What MCP tools are available?"**
3. You should see the list of 29 waste management tools

Or look for an MCP indicator/badge in the chat interface.

## 🧪 Test Commands Once Loaded

Try these in Cursor chat:

```
List all contaminated shipments
```

```
Get shipment S2 with its contaminants
```

```
Show me contamination rate statistics
```

```
Get facility F1 with recent activity
```

## 🐛 If Still Not Working

### Check 1: Verify yarn path

```bash
which yarn
```

Your output: `/Users/yab/.nvm/versions/node/v22.19.0/bin/yarn`

If different, update the `command` in the configuration above.

### Check 2: Verify dist/main.js exists

```bash
ls -la /Users/yab/Projects/clear-ai-v2/dist/main.js
```

Should show the file exists.

### Check 3: Test MCP server manually

```bash
cd /Users/yab/Projects/clear-ai-v2
yarn dev
```

Should show:
```
✓ Registered 29 comprehensive waste management tools
MCP Server started with 29 tools
✓ MCP Server is ready
```

### Check 4: Alternative Configuration

If the above doesn't work, try this simpler version:

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "yarn",
      "args": [
        "start"
      ],
      "cwd": "/Users/yab/Projects/clear-ai-v2"
    }
  }
}
```

### Check 5: Cursor Logs

Look at Cursor's MCP logs:
1. Help → Toggle Developer Tools
2. Console tab
3. Look for MCP or waste-management errors

## 📦 What Each Tool Does

Once loaded, you can use these 29 tools:

### CRUD Operations (20 tools)
- `shipments_list`, `shipments_get`, `shipments_create`, `shipments_update`, `shipments_delete`
- `facilities_list`, `facilities_get`, `facilities_create`, `facilities_update`, `facilities_delete`
- `contaminants_list`, `contaminants_get`, `contaminants_create`, `contaminants_update`, `contaminants_delete`
- `inspections_list`, `inspections_get`, `inspections_create`, `inspections_update`, `inspections_delete`

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

## 🎯 Quick Start Checklist

- [ ] API server running (`yarn api:dev`)
- [ ] MCP configuration added to Cursor settings
- [ ] Cursor completely restarted
- [ ] Waited for MCP to initialize
- [ ] Tested with a simple query

---

**Need help?** Share your Cursor version and any error messages you see!


