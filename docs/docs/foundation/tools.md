---
sidebar_position: 4
---

# Tools

MCP-compliant tool implementations for the waste management domain: Shipments, Facilities, Contaminants, and Inspections.

## What Problem Does This Solve?

**Problem:** Need domain-specific operations
**Solution:** MCP-standard tool implementations

## Available Tools

### Shipments
```typescript
import { ShipmentsListTool } from 'clear-ai-v2/tools';

const tool = new ShipmentsListTool();
const result = await tool.execute({
  has_contaminants: true,
  date_from: '2024-01-01'
});
```

### Facilities
```typescript
import { FacilitiesListTool } from 'clear-ai-v2/tools';

const tool = new FacilitiesListTool();
const result = await tool.execute({
  type: 'processing',
  min_capacity: 100
});
```

### Contaminants
```typescript
import { ContaminantsListTool } from 'clear-ai-v2/tools';

const tool = new ContaminantsListTool();
const result = await tool.execute({
  risk_level: 'high',
  date_from: '2024-01-01'
});
```

### Inspections
```typescript
import { InspectionsListTool } from 'clear-ai-v2/tools';

const tool = new InspectionsListTool();
const result = await tool.execute({
  status: 'rejected',
  has_risk_contaminants: true
});
```

## MCP Compliance

All tools follow MCP standard:
- Standardized input schemas
- Consistent output format
- Error handling
- Metadata tracking

## Testing

```bash
yarn test tools  # 44 tests
```

---

**Next:** [API](./api.md)
