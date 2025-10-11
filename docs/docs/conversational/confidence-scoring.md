---
sidebar_position: 3
---

# Confidence Scoring

Confidence Scoring quantifies how certain the AI is about its results. Instead of always sounding confident, the system calculates confidence scores based on data quality, completeness, and tool success rates.

## What Problem Does This Solve?

**The Problem:** Traditional AI always sounds certain, even with limited data:
- "The trend is upward" (based on 3 data points out of 100 expected)
- "User prefers X" (never actually asked the user)

**The Solution:** Express uncertainty appropriately:
- "Based on limited data (3%), I'm 30% confident the trend is upward"
- Automatic disclaimers when confidence < 70%

## Core Concept

Confidence is a number between **0 and 1** (0% to 100%):

- **0.9-1.0 (90-100%)**: Very high confidence - strong data, clear answer
- **0.7-0.9 (70-90%)**: High confidence - good data, reasonable answer
- **0.5-0.7 (50-70%)**: Medium confidence - some uncertainty, add disclaimer
- **0.3-0.5 (30-50%)**: Low confidence - significant uncertainty
- **0-0.3 (0-30%)**: Very low confidence - very uncertain

**Threshold**: Disclaimers are automatically added when confidence < **0.7 (70%)**

## Basic Usage

```typescript
import { ConfidenceScorer } from 'clear-ai-v2/shared';

const scorer = new ConfidenceScorer();

// Score based on data quantity
const confidence = scorer.scoreFromDataCount(
  75,   // Actual count
  100   // Expected count
);
// Returns: 0.85 (85% - good amount)

// Determine confidence level
const level = scorer.getConfidenceLevel(confidence);
// Returns: 'high'

// Check if should express uncertainty
if (scorer.shouldExpressUncertainty(confidence)) {
  // Add disclaimer to response
}
```

## Scoring Methods

### 1. Score from Data Count

Rate confidence based on how much data you have vs. expected:

```typescript
// Perfect: Got all expected data
scorer.scoreFromDataCount(100, 100);  // → 0.95 (95%)

// Good: Got 75% of expected
scorer.scoreFromDataCount(75, 100);   // → 0.85 (85%)

// Moderate: Got 50% of expected
scorer.scoreFromDataCount(50, 100);   // → 0.70 (70%)

// Low: Got only 10% of expected
scorer.scoreFromDataCount(10, 100);   // → 0.30 (30%)

// No expectation: Some data is moderate confidence
scorer.scoreFromDataCount(50, 0);     // → 0.70 (70%)
```

### 2. Score from Data Completeness

Rate confidence based on how complete your data is:

```typescript
const data = {
  id: '123',
  name: 'FacilityA',
  status: 'active',
  capacity: 1000
  // missing: location, contact, certifications
};

const requiredFields = [
  'id', 'name', 'status', 'capacity',
  'location', 'contact', 'certifications'
];

const score = scorer.scoreFromDataCompleteness(data, requiredFields);
// Returns: 0.57 (57% - 4 out of 7 fields present)
```

### 3. Score from Tool Results

Rate confidence based on tool execution success:

```typescript
const results = [
  { success: true, tool: 'shipments', data: {...} },
  { success: true, tool: 'facilities', data: {...} },
  { success: false, tool: 'inspections', error: {...} }
];

const score = scorer.scoreFromToolResults(results);
// Returns: 0.67 (67% - 2 out of 3 succeeded)
```

## Combining Multiple Scores

When you have multiple confidence factors, combine them:

```typescript
const dataScore = scorer.scoreFromDataCount(50, 100);        // 0.70
const completenessScore = scorer.scoreFromDataCompleteness(  // 0.80
  data, 
  requiredFields
);
const toolScore = scorer.scoreFromToolResults(results);      // 0.90

const overallConfidence = scorer.combineScores([
  dataScore,
  completenessScore,
  toolScore
]);
// Returns: 0.80 (80% - average of all scores)
```

## Confidence Levels

Convert numeric scores to descriptive labels:

```typescript
scorer.getConfidenceLevel(0.95);  // → 'very_high'
scorer.getConfidenceLevel(0.82);  // → 'high'
scorer.getConfidenceLevel(0.65);  // → 'medium'
scorer.getConfidenceLevel(0.45);  // → 'low'
scorer.getConfidenceLevel(0.20);  // → 'very_low'
```

**Level Thresholds:**
- `very_high`: ≥ 0.9
- `high`: 0.7 - 0.9
- `medium`: 0.5 - 0.7
- `low`: 0.3 - 0.5
- `very_low`: < 0.3

## Integration with Response System

Use with `ResponseBuilder` to automatically add disclaimers:

```typescript
import { ResponseBuilder, ConfidenceScorer } from 'clear-ai-v2/shared';

const scorer = new ConfidenceScorer();

// Calculate confidence
const confidence = scorer.scoreFromDataCount(15, 100);  // 0.40 (40%)

// Build response
const response = ResponseBuilder.answer(
  "Upward trend detected",
  { trend: 'up', dataPoints: 15 }
);

// Add confidence (automatically adds disclaimer if < 0.7)
const final = ResponseBuilder.withConfidence(response, confidence);

// Result:
// "Upward trend detected
//
// ⚠️ Note: I'm not completely certain about this result (confidence: 40%)."
```

## Real-World Example

Complete confidence scoring in an analysis workflow:

```typescript
async function analyzeShipments(filters: any) {
  const scorer = new ConfidenceScorer();
  
  // Fetch data
  const shipments = await fetchShipments(filters);
  const expectedCount = 200;
  
  // Calculate data quantity confidence
  const dataScore = scorer.scoreFromDataCount(
    shipments.length,
    expectedCount
  );
  
  // Check data completeness
  const requiredFields = [
    'id', 'facility_id', 'date', 'weight_kg',
    'status', 'waste_type', 'carrier'
  ];
  
  const avgCompleteness = shipments.reduce((sum, ship) => {
    return sum + scorer.scoreFromDataCompleteness(ship, requiredFields);
  }, 0) / shipments.length;
  
  // Analyze patterns
  const analysis = performAnalysis(shipments);
  
  // Check if anomalies detected (lowers confidence)
  const anomalyPenalty = analysis.anomalies > 5 ? -0.15 : 0;
  
  // Combine all factors
  const overallConfidence = scorer.combineScores([
    dataScore,
    avgCompleteness
  ]) + anomalyPenalty;
  
  // Determine if should express uncertainty
  const shouldWarn = scorer.shouldExpressUncertainty(overallConfidence);
  
  // Build response
  let content = `Analysis complete: ${analysis.summary}`;
  
  if (shouldWarn) {
    content += `\n\nNote: Confidence is ${Math.round(overallConfidence * 100)}% due to:`;
    if (dataScore < 0.7) content += `\n- Limited data (${shipments.length}/${expectedCount})`;
    if (avgCompleteness < 0.8) content += `\n- Incomplete records`;
    if (anomalyPenalty < 0) content += `\n- ${analysis.anomalies} anomalies detected`;
  }
  
  return ResponseBuilder.withConfidence(
    ResponseBuilder.answer(content, analysis),
    overallConfidence
  );
}
```

## Customizing Uncertainty Threshold

Change when disclaimers are added:

```typescript
const scorer = new ConfidenceScorer();

// Default threshold is 0.7
scorer.shouldExpressUncertainty(0.65);  // true

// Set stricter threshold (only warn below 50%)
scorer.setUncertaintyThreshold(0.5);

scorer.shouldExpressUncertainty(0.65);  // false
scorer.shouldExpressUncertainty(0.45);  // true
```

## Testing

The Confidence Scorer has 21 unit tests covering:
- All scoring methods
- Score combination
- Confidence level classification
- Uncertainty thresholds
- Edge cases (zero expected, null data, etc.)

```bash
yarn test --testNamePattern="ConfidenceScorer"
```

## Best Practices

### 1. Consider Multiple Factors

```typescript
// ❌ Don't use just one factor
const confidence = dataScore;

// ✅ Combine multiple factors
const confidence = scorer.combineScores([
  dataScore,
  completenessScore,
  toolSuccessScore
]);
```

### 2. Explain Low Confidence

```typescript
// ❌ Don't just say "low confidence"
"I'm 40% confident"

// ✅ Explain why
"I'm 40% confident due to limited data (15 out of 200 records)"
```

### 3. Don't Hide Uncertainty

```typescript
// ❌ Don't pretend you're certain
if (confidence < 0.7) {
  // Return vague answer without disclaimer
}

// ✅ Express uncertainty honestly
return ResponseBuilder.withConfidence(response, confidence);
```

## Type Definitions

```typescript
type ConfidenceLevel = 
  | 'very_low'   // < 0.3
  | 'low'        // 0.3 - 0.5
  | 'medium'     // 0.5 - 0.7
  | 'high'       // 0.7 - 0.9
  | 'very_high'; // ≥ 0.9

interface ConfidenceFactors {
  dataCount?: number;
  dataCompleteness?: number;
  toolSuccess?: number;
  anomalies?: number;
}
```

## API Reference

### `scorer.scoreFromDataCount(actualCount, expectedCount)`

Calculate confidence based on data quantity.

**Parameters:**
- `actualCount` (number): How many records you have
- `expectedCount` (number): How many you expected

**Returns:** `number` (0-1)

### `scorer.scoreFromDataCompleteness(data, requiredFields)`

Calculate confidence based on data completeness.

**Parameters:**
- `data` (any): The data object to check
- `requiredFields` (string[]): List of required field names

**Returns:** `number` (0-1)

### `scorer.scoreFromToolResults(results)`

Calculate confidence based on tool execution results.

**Parameters:**
- `results` (ToolResult[]): Array of tool execution results

**Returns:** `number` (0-1)

### `scorer.combineScores(scores)`

Combine multiple confidence scores.

**Parameters:**
- `scores` (number[]): Array of confidence scores (0-1)

**Returns:** `number` (0-1) - Average of all scores

### `scorer.getConfidenceLevel(score)`

Get descriptive label for a score.

**Parameters:**
- `score` (number): Confidence score (0-1)

**Returns:** `ConfidenceLevel`

### `scorer.shouldExpressUncertainty(score)`

Check if uncertainty disclaimer should be added.

**Parameters:**
- `score` (number): Confidence score (0-1)

**Returns:** `boolean` - true if score < threshold (default 0.7)

### `scorer.setUncertaintyThreshold(threshold)`

Set custom uncertainty threshold.

**Parameters:**
- `threshold` (number): New threshold (0-1)

**Returns:** `void`

---

**Next:** [Progress Tracking](./progress-tracking.md) - Track multi-step tasks

