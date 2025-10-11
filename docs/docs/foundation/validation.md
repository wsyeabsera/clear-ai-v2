---
sidebar_position: 2
---

# Validation

Runtime validation using Zod schemas. Validate user inputs, API responses, and configuration at runtime with clear error messages.

## What Problem Does This Solve?

**Problem:** Invalid data causes runtime errors
**Solution:** Zod schemas validate data with helpful errors

## Basic Usage

```typescript
import { shipmentSchema } from 'clear-ai-v2/shared';

const result = shipmentSchema.safeParse(data);

if (result.success) {
  console.log(result.data);  // Type-safe, validated data
} else {
  console.error(result.error.errors);  // Clear error messages
}
```

## Available Schemas

- shipmentSchema
- facilitySchema
- contaminantSchema
- inspectionSchema
- agentResponseSchema
- llmConfigSchema
- memoryConfigSchema

## Testing

```bash
yarn test validation  # 30 tests
```

---

**Next:** [Utilities](./utilities.md)
