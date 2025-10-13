# Database Reset Endpoint

## Overview

Added a new `/api/reset` endpoint that deletes ALL data from the database and reseeds it with fresh test data.

## ⚠️ **WARNING**
This endpoint is **DESTRUCTIVE** and should only be used in development/testing environments!

## What It Does

1. **Clears all collections**: Deletes all data from:
   - Shipments
   - Facilities
   - Contaminants
   - Inspections

2. **Reseeds with test data**: Adds fresh sample data:
   - 10 facilities
   - 12 shipments
   - 8 contaminants
   - 12 inspections

## API Endpoint

**POST** `/api/reset`

### Request
```bash
curl -X POST http://localhost:4000/api/reset -H "Content-Type: application/json"
```

### Response
```json
{
  "success": true,
  "message": "Database reset successfully. All data cleared and reseeded.",
  "data": {
    "facilities": 10,
    "shipments": 12,
    "contaminants": 8,
    "inspections": 12
  }
}
```

## MCP Tool

### Tool Name
`database_reset`

### Usage

Once you restart Cursor, you'll have access to the new tool. You can use it by asking:
```
Reset the database
```

or

```
Clear all data and reseed the database
```

### To Get the New Tool in Cursor

1. **Completely quit Cursor** (`Cmd + Q` on Mac)
2. **Restart Cursor**
3. **Wait 10-15 seconds** for MCP to reload
4. The new `database_reset` tool will now be available (30 tools total)

## Swagger Documentation

The reset endpoint is documented in Swagger UI at:
- http://localhost:4000/api-docs

Look for the **Database** tag/section.

## Files Created/Modified

### New Files
- `src/api/db/seed-data.ts` - Extracted seed data and logic
- `src/api/routes/reset.ts` - Reset endpoint route handler
- `src/tools/reset.ts` - MCP tool for database reset

### Modified Files
- `src/api/db/seed.ts` - Updated to use extracted seed-data module
- `src/api/routes/index.ts` - Added reset router
- `src/api/swagger.ts` - Added reset endpoint documentation
- `src/tools/index.ts` - Registered database reset tool

## Use Cases

### 1. Testing
Reset the database to a known state before running tests:
```bash
curl -X POST http://localhost:4000/api/reset
# Now run your tests
```

### 2. Demo Preparation
Quickly restore clean demo data:
```bash
curl -X POST http://localhost:4000/api/reset
```

### 3. Development
Clear messy test data and start fresh:
```bash
curl -X POST http://localhost:4000/api/reset
```

## Tool Count

**Before**: 29 MCP tools
**After**: 30 MCP tools

- 20 CRUD operations
- 4 Analytics tools
- 5 Relationship tools  
- **1 Database management tool** ← NEW!

## Benefits

✅ **Fast**: Resets database in seconds  
✅ **Consistent**: Always returns to same clean state  
✅ **Convenient**: Available via API and MCP tool  
✅ **Documented**: Included in Swagger UI  
✅ **Safe**: Returns summary of what was seeded

## Next Steps

1. Restart Cursor to get the new MCP tool
2. Test the endpoint via Swagger UI or curl
3. Use it whenever you need a fresh database state

---

**Note**: In production, this endpoint should be disabled or protected with authentication!

