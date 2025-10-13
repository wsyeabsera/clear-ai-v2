# 🚀 START HERE - Cursor MCP Setup

## The Problem
Cursor says "no tools, resources" but your MCP server works perfectly (29 tools registered).

## The Solution
Try each configuration below **one at a time** until one works.

---

## 🔴 BEFORE YOU START

### Step 0: Start the API Server

```bash
cd /Users/yab/Projects/clear-ai-v2
yarn api:dev
```

**Keep this running** in a separate terminal. Don't close it!

---

## Configuration to Try

### Open Cursor Settings

Press: `Cmd + Shift + P`  
Type: `Preferences: Open User Settings (JSON)`  
Press: `Enter`

### Try Configuration #1 (Simplest)

**Replace** or **add** this to your settings:

```json
{
  "mcpServers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
    }
  }
}
```

**Save** (`Cmd + S`), **completely quit** Cursor (`Cmd + Q`), **restart** Cursor, **wait 15 seconds**.

### If That Doesn't Work, Try Configuration #2

```json
{
  "mcp.servers": {
    "waste-management": {
      "command": "/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh"
    }
  }
}
```

**Save**, **quit**, **restart**, **wait**.

### If That Doesn't Work, Try Configuration #3

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

**Save**, **quit**, **restart**, **wait**.

---

## ✅ How to Test If It Worked

Open Cursor chat (`Cmd + L`) and type:

```
List all shipments
```

If you see MCP tools being used or get actual shipment data, **IT WORKS!** 🎉

---

## 🐛 Still Not Working?

### Test the wrapper script manually:

```bash
cd /Users/yab/Projects/clear-ai-v2
./mcp-wrapper.sh
```

You should see:
```
Starting MCP Server...
✓ Registered 29 comprehensive waste management tools
```

If you see that, the server works. It's just Cursor configuration.

### Check Cursor version:

`Help → About Cursor` - what version do you have?

### Check Cursor logs:

1. `Help → Toggle Developer Tools`
2. `Console` tab
3. Look for "MCP" or "waste" errors
4. **Share those errors with me**

---

## 📋 Quick Checklist

- [ ] API server is running (`yarn api:dev`)
- [ ] Added MCP config to Cursor settings
- [ ] Saved settings file
- [ ] **Completely quit** Cursor (not just close window)
- [ ] Restarted Cursor
- [ ] Waited at least 15 seconds
- [ ] Tried asking "List all shipments" in chat

---

**If you've done all of this and it still says "no tools, resources", please share:**

1. Your Cursor version number
2. Which configuration format you tried
3. Any errors from the Console (Developer Tools)
4. The exact error message you see

The MCP server is confirmed working. We just need to find the right config format for your Cursor version!

