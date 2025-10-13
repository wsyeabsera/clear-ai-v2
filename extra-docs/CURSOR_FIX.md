# 🔧 Cursor MCP Configuration - Complete Fix

## ✅ Verified Working

The MCP server is **100% working** and returns all 29 tools. This is just a Cursor configuration issue.

## 🎯 Try These Configurations (In Order)

### Configuration 1: Using Wrapper Script (RECOMMENDED)

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
    }
  }
}
```

### Configuration 2: Using Yarn with Full Path

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/.nvm/versions/node/v22.19.0/bin/yarn",
      "args": ["node", "/Users/yab/Projects/clear-ai-v2/dist/main.js"],
      "cwd": "/Users/yab/Projects/clear-ai-v2"
    }
  }
}
```

### Configuration 3: Alternative Key Format

Some Cursor versions use `mcp` instead of `mcpServers`:

```json
{
  "mcp": {
    "servers": {
      "waste-management": {
        "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
      }
    }
  }
}
```

### Configuration 4: Full Specification

```json
{
  "mcp.servers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh",
      "env": {
        "WASTEER_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

## 📝 Step-by-Step Setup

### 1. Start API Server First

**CRITICAL**: The API server must be running!

```bash
# Open Terminal 1
cd /Users/yab/Projects/clear-ai-v2
yarn api:dev
```

Keep this running. You should see:
```
API Server running on http://localhost:4000
Connected to MongoDB
```

### 2. Open Cursor Settings

**Method 1** (Recommended):
- Press `Cmd + Shift + P`
- Type: `Preferences: Open User Settings (JSON)`
- Press Enter

**Method 2**:
- Cursor → Settings (or `Cmd + ,`)
- Search for "mcp"
- Click "Edit in settings.json"

### 3. Add Configuration

**Start with Configuration 1** (the wrapper script).

If you already have other settings, merge it like this:

```json
{
  "editor.fontSize": 14,
  "other.settings": "...",
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
    }
  }
}
```

### 4. Save and Restart

1. **Save** the settings file (`Cmd + S`)
2. **Completely quit** Cursor (`Cmd + Q`)
3. **Wait 5 seconds**
4. **Restart** Cursor
5. **Wait 10-15 seconds** for MCP to initialize

### 5. Test

Open Cursor chat (`Cmd + L`) and ask:

```
What MCP tools do you have?
```

or

```
List all shipments
```

You should see the AI using MCP tools!

## 🔍 Debugging

### Check 1: Verify Wrapper Script Works

```bash
cd /Users/yab/Projects/clear-ai-v2
./mcp-wrapper.sh
```

Should show:
```
Starting MCP Server...
✓ Registered 29 comprehensive waste management tools
```

Press `Ctrl+C` to stop.

### Check 2: Check Cursor Logs

1. In Cursor: `Help → Toggle Developer Tools`
2. Click `Console` tab
3. Look for errors mentioning "MCP" or "waste-management"
4. Share any errors you see

### Check 3: Verify Settings File Location

The settings file should be at:
- Mac: `~/Library/Application Support/Cursor/User/settings.json`
- Linux: `~/.config/Cursor/User/settings.json`
- Windows: `%APPDATA%\Cursor\User\settings.json`

You can check it:
```bash
cat ~/Library/Application\ Support/Cursor/User/settings.json | grep -A5 mcp
```

### Check 4: Try Different Config Keys

If none of the above work, your Cursor version might use a different format. Try each of these:

1. `"mcpServers"` (most common)
2. `"mcp.servers"`
3. `"mcp": { "servers": { ... } }`

### Check 5: Rebuild Project

Sometimes the dist folder can be stale:

```bash
cd /Users/yab/Projects/clear-ai-v2
yarn build
```

Then restart Cursor.

## 🆘 If Still Not Working

### Option A: Manual Test

Let's verify Cursor can start the script:

```bash
# Test exactly what Cursor would run
/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh
```

If this hangs (doesn't error), that's **GOOD**. It means the server is waiting for JSON-RPC input.

Press `Ctrl+C` and try adding to Cursor.

### Option B: Check Cursor Version

What version of Cursor are you using?

1. `Help → About Cursor`
2. Share the version number

Different versions might need different config formats.

### Option C: Check for Conflicting MCP Servers

If you have other MCP servers configured, they might conflict. Temporarily comment them out:

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
    }
    // "other-server": { ... }  // ← temporarily comment out
  }
}
```

## ✨ Once Working

When tools load, you'll be able to:

### Query Data
```
Show all shipments with contaminants
Get contamination rate statistics
List facilities in Springfield
```

### Create Data
```
Create a new shipment from Springfield to Shelbyville
```

### Update Data
```
Update shipment S1 status to delivered
```

### Analytics
```
Show me waste type distribution
Get risk trends for the last 7 days
```

### Relationships
```
Get shipment S2 with all its contaminants
Show me facility F1 activity for last 30 days
```

## 📊 The 29 Tools Available

Once loaded, you'll have:

**Shipments** (5): list, get, create, update, delete
**Facilities** (5): list, get, create, update, delete  
**Contaminants** (5): list, get, create, update, delete
**Inspections** (5): list, get, create, update, delete
**Analytics** (4): contamination_rate, facility_performance, waste_distribution, risk_trends
**Relationships** (5): shipments_with_contaminants, shipments_detailed, facilities_with_activity, facilities_detailed, inspections_detailed

---

**Still stuck?** Share:
1. Your Cursor version (`Help → About`)
2. The exact config you added
3. Any errors from Developer Tools Console
4. Output of: `./mcp-wrapper.sh` (then Ctrl+C)

