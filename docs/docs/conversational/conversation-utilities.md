---
sidebar_position: 5
---

# Conversation Utilities

Conversation Utilities provide helper functions for understanding and parsing user messages in business contexts. Extract entities, detect yes/no responses, parse timeframes, and identify follow-up questions.

## What Problem Does This Solve?

User messages contain valuable structured information that needs extraction:
- *"Show shipments from FacilityA and FacilityB"* → Extract: `["FacilityA", "FacilityB"]`
- *"From 2024-01-01 to 2024-12-31"* → Extract: `{from: "2024-01-01", to: "2024-12-31"}`
- *"Plastic and metal contamination"* → Extract: `["plastic", "metal"]`

This module automates all of that.

## Basic Usage

```typescript
import { ConversationUtils } from 'clear-ai-v2/shared';

const utils = new ConversationUtils();

// Check yes/no
utils.isAffirmative("yes");  // true
utils.isNegative("no");     // true

// Extract timeframes
const timeframe = utils.extractTimeframe("Show data from last week");
// Returns: { reference: "last week" }

// Extract business entities
const entities = utils.extractBusinessEntities(
  "Show contaminated shipments from FacilityA"
);
// Returns: {
//   facilities: ["FacilityA"],
//   statuses: [],
//   wasteTypes: [],
//   dates: []
// }
```

## Yes/No Detection

### Affirmative Detection

```typescript
utils.isAffirmative("yes");        // true
utils.isAffirmative("yeah");       // true
utils.isAffirmative("ok");         // true
utils.isAffirmative("sure");       // true
utils.isAffirmative("go ahead");   // true
utils.isAffirmative("proceed");    // true
utils.isAffirmative("YeSS");       // true (case-insensitive)

utils.isAffirmative("no");         // false
utils.isAffirmative("maybe");      // false
```

**Recognized words:** yes, yeah, yep, ok, okay, sure, go ahead, proceed, continue, confirm, approve, accept

### Negative Detection

```typescript
utils.isNegative("no");            // true
utils.isNegative("nope");          // true
utils.isNegative("cancel");        // true
utils.isNegative("stop");          // true
utils.isNegative("nevermind");     // true

utils.isNegative("yes");           // false
```

**Recognized words:** no, nope, nah, cancel, stop, abort, deny, reject, nevermind, never mind

## Timeframe Extraction

Extract time references from messages:

```typescript
// Relative time references
utils.extractTimeframe("Show data from today");
// Returns: { reference: "today" }

utils.extractTimeframe("Shipments from last week");
// Returns: { reference: "last week" }

// Date ranges
utils.extractTimeframe("From 2024-01-01 to 2024-12-31");
// Returns: { from: "2024-01-01", to: "2024-12-31" }

// Single date
utils.extractTimeframe("Data from 2024-10-15");
// Returns: { from: "2024-10-15" }

// No timeframe
utils.extractTimeframe("Show all facilities");
// Returns: {}
```

**Supported references:** today, yesterday, this week, last week, this month, last month, this year, last year

**Date format:** YYYY-MM-DD (ISO 8601)

## Business Entity Extraction

Extract domain-specific entities from messages:

### Facilities

```typescript
const entities = utils.extractBusinessEntities(
  "Show shipments from FacilityA and FacilityB"
);
// entities.facilities = ["FacilityA", "FacilityB"]
```

**Pattern:** `Facility[A-Z]` (e.g., FacilityA, FacilityB, FacilityX)

### Statuses

```typescript
const entities = utils.extractBusinessEntities(
  "Show pending and delivered shipments"
);
// entities.statuses = ["pending", "delivered"]
```

**Recognized statuses:** pending, in_transit, delivered, rejected, accepted, processing, completed

### Waste Types

```typescript
const entities = utils.extractBusinessEntities(
  "Plastic and metal contamination"
);
// entities.wasteTypes = ["plastic", "metal"]
```

**Recognized types:** plastic, metal, paper, glass, organic, hazardous, electronic, industrial

### Dates

```typescript
const entities = utils.extractBusinessEntities(
  "From 2024-01-01 to 2024-12-31"
);
// entities.dates = ["2024-01-01", "2024-12-31"]
```

### Complete Example

```typescript
const message = "Show contaminated plastic shipments from FacilityA between 2024-01-01 and 2024-03-31";

const entities = utils.extractBusinessEntities(message);

// Result:
{
  facilities: ["FacilityA"],
  statuses: [],  // "contaminated" is not a status
  wasteTypes: ["plastic"],
  dates: ["2024-01-01", "2024-03-31"]
}
```

## Follow-Up Detection

Detect when users are referring to previous conversation:

```typescript
utils.isFollowUp("What about FacilityB?");         // true
utils.isFollowUp("And the rejected ones?");        // true
utils.isFollowUp("Also show me facilities");       // true
utils.isFollowUp("Tell me more about them");       // true
utils.isFollowUp("What about those?");             // true

utils.isFollowUp("Show me shipments");             // false
```

**Indicators:**
- Words: "what about", "how about", "and", "also", "additionally"
- Pronouns: "it", "them", "those", "these", "that", "this"

## Reference Extraction

Extract pronoun references:

```typescript
utils.extractReferences("Tell me more about them");
// Returns: ["them"]

utils.extractReferences("What about those and that facility?");
// Returns: ["those", "that"]

utils.extractReferences("Show me data");
// Returns: []
```

**Detected pronouns:** it, them, those, these, that, this

## Text Normalization

Normalize text for comparison:

```typescript
utils.simplifyForComparison("  Show  ME  Data!!  ");
// Returns: "show me data"

// Removes:
// - Extra whitespace
// - Punctuation
// - Converts to lowercase
```

**Use case:** Compare user input to predefined commands

## Real-World Example

Complete conversation handler with entity extraction:

```typescript
class BusinessAgent {
  private utils = new ConversationUtils();
  private lastResults: any = null;
  
  async handleMessage(message: string) {
    // Check for yes/no
    if (this.utils.isAffirmative(message)) {
      return this.handleConfirmation(true);
    }
    if (this.utils.isNegative(message)) {
      return this.handleConfirmation(false);
    }
    
    // Check for follow-up
    if (this.utils.isFollowUp(message)) {
      return this.handleFollowUp(message);
    }
    
    // Extract entities for new query
    const entities = this.utils.extractBusinessEntities(message);
    const timeframe = this.utils.extractTimeframe(message);
    
    // Build query from entities
    const query: any = {};
    
    if (entities.facilities.length > 0) {
      query.facility_id = { $in: entities.facilities };
    }
    
    if (entities.statuses.length > 0) {
      query.status = { $in: entities.statuses };
    }
    
    if (entities.wasteTypes.length > 0) {
      query.waste_type = { $in: entities.wasteTypes };
    }
    
    if (timeframe.from && timeframe.to) {
      query.date = { $gte: timeframe.from, $lte: timeframe.to };
    } else if (timeframe.reference) {
      query.date = this.convertTimeReference(timeframe.reference);
    }
    
    // Execute query
    const results = await this.executeQuery(query);
    this.lastResults = results;
    
    return ResponseBuilder.answer(
      `Found ${results.length} matching records`,
      results
    );
  }
  
  async handleFollowUp(message: string) {
    if (!this.lastResults) {
      return ResponseBuilder.answer("I don't have previous results to filter");
    }
    
    // Extract new filters from follow-up
    const entities = this.utils.extractBusinessEntities(message);
    
    // Apply filters to previous results
    let filtered = this.lastResults;
    
    if (entities.facilities.length > 0) {
      filtered = filtered.filter((r: any) =>
        entities.facilities.includes(r.facility_id)
      );
    }
    
    if (entities.statuses.length > 0) {
      filtered = filtered.filter((r: any) =>
        entities.statuses.includes(r.status)
      );
    }
    
    return ResponseBuilder.answer(
      `Found ${filtered.length} matching records`,
      filtered
    );
  }
}
```

## Testing

Conversation Utilities has 20 unit tests covering:
- Yes/no detection
- Timeframe extraction
- Entity extraction (all types)
- Follow-up detection
- Reference extraction
- Text normalization

```bash
yarn test --testNamePattern="ConversationUtils"
```

## Customization

Extend the utilities for your domain:

```typescript
class CustomUtils extends ConversationUtils {
  // Add custom entity types
  extractCustomEntities(message: string) {
    const entities = super.extractBusinessEntities(message);
    
    // Add your own patterns
    const customPattern = /Customer[A-Z0-9]+/g;
    const customers = message.match(customPattern) || [];
    
    return {
      ...entities,
      customers
    };
  }
  
  // Add custom timeframe patterns
  extractExtendedTimeframe(message: string) {
    const timeframe = super.extractTimeframe(message);
    
    // Add relative patterns like "2 weeks ago"
    const relativePattern = /(\d+)\s+(days?|weeks?|months?)\s+ago/;
    const match = message.match(relativePattern);
    
    if (match) {
      return {
        ...timeframe,
        relative: { amount: parseInt(match[1]), unit: match[2] }
      };
    }
    
    return timeframe;
  }
}
```

## Best Practices

### 1. Validate Extracted Entities

```typescript
const entities = utils.extractBusinessEntities(message);

// ❌ Don't assume entities exist
const facility = entities.facilities[0];

// ✅ Check first
if (entities.facilities.length > 0) {
  const facility = entities.facilities[0];
}
```

### 2. Combine with Intent Classification

```typescript
const intent = classifier.classify(message);
const entities = utils.extractBusinessEntities(message);

if (intent.intent === 'query' && entities.facilities.length === 0) {
  // Query but no facility specified
  return ResponseBuilder.question(
    "Which facility?",
    ["FacilityA", "FacilityB", "FacilityC"]
  );
}
```

### 3. Handle Ambiguous Timeframes

```typescript
const timeframe = utils.extractTimeframe(message);

if (!timeframe.reference && !timeframe.from) {
  // No timeframe specified
  return ResponseBuilder.question(
    "Which time period?",
    ["today", "this week", "this month"]
  );
}
```

## Type Definitions

```typescript
interface BusinessEntities {
  facilities: string[];      // FacilityA, FacilityB, etc.
  statuses: string[];        // pending, delivered, etc.
  wasteTypes: string[];      // plastic, metal, etc.
  dates: string[];           // ISO date strings
}

interface TimeframeResult {
  reference?: string;  // "today", "last week", etc.
  from?: string;       // ISO date
  to?: string;         // ISO date
}
```

## API Reference

### isAffirmative(message)

Check if message is affirmative.

**Returns:** `boolean`

### isNegative(message)

Check if message is negative.

**Returns:** `boolean`

### extractTimeframe(message)

Extract time reference from message.

**Returns:** `TimeframeResult`

### extractBusinessEntities(message)

Extract business entities from message.

**Returns:** `BusinessEntities`

### extractReferences(message)

Extract pronoun references.

**Returns:** `string[]`

### isFollowUp(message)

Check if message is a follow-up.

**Returns:** `boolean`

### simplifyForComparison(text)

Normalize text for comparison.

**Returns:** `string`

---

**Conversational AI complete!** Continue to [Context Management](../context-memory/context-management.md)

