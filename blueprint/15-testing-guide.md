# Testing Guide - Clear AI v2

## Test Suite Overview

We have **47 comprehensive tests** covering all MCP server and tool functionality.

### Test Structure

```
src/tests/
├── fixtures/
│   └── waste-data.ts          # Mock data for all tests
├── mcp/
│   └── server.test.ts         # MCP server tests (6 tests)
└── tools/
    ├── shipments.test.ts      # Shipments tool tests (10 tests)
    ├── facilities.test.ts     # Facilities tool tests (9 tests)
    ├── contaminants.test.ts   # Contaminants tool tests (11 tests)
    └── inspections.test.ts    # Inspections tool tests (11 tests)
```

## Running Tests

### Basic Commands

```bash
# Run all tests
yarn test

# Watch mode (auto-rerun on changes)
yarn test:watch

# Coverage report
yarn test:coverage

# Run specific test file
yarn test shipments.test.ts

# Run tests matching pattern
yarn test --testNamePattern="filter"
```

### Expected Output

```
PASS src/tests/mcp/server.test.ts
PASS src/tests/tools/facilities.test.ts
PASS src/tests/tools/contaminants.test.ts
PASS src/tests/tools/inspections.test.ts
PASS src/tests/tools/shipments.test.ts

Test Suites: 5 passed, 5 total
Tests:       47 passed, 47 total
Snapshots:   0 total
Time:        0.894 s
```

## Test Categories

### 1. MCP Server Tests (`server.test.ts`)

Tests the core MCP server functionality:

- ✅ Server instance creation
- ✅ Tool registration (single & multiple)
- ✅ Tool retrieval by name
- ✅ Tool replacement handling
- ✅ Non-existent tool queries

**Example:**
```typescript
it('should register a tool', () => {
  const shipmentsTool = new ShipmentsTool(apiUrl);
  server.registerTool(shipmentsTool);
  
  expect(server.getToolCount()).toBe(1);
  expect(server.getTool('shipments')).toBeDefined();
});
```

### 2. Tool Tests

Each tool has comprehensive tests covering:

#### Standard Test Cases (All Tools)
- ✅ Tool metadata validation (name, description, schema)
- ✅ Fetch all records (no filters)
- ✅ Multiple filter combinations
- ✅ API error handling (500, 404, etc.)
- ✅ Network error handling
- ✅ Parameter validation

#### Shipments Tool Specific Tests
```typescript
✓ should fetch all shipments with default limit
✓ should fetch shipments with date filter
✓ should filter shipments with contaminants
✓ should filter shipments by facility
✓ should filter shipments by status
✓ should handle custom limit parameter
✓ should handle API errors gracefully
✓ should handle network errors gracefully
✓ should handle multiple filters simultaneously
```

#### Facilities Tool Specific Tests
```typescript
✓ should fetch all facilities
✓ should filter facilities by location (e.g., "Hannover")
✓ should filter facilities by type (sorting, processing, disposal)
✓ should filter facilities by minimum capacity
✓ should fetch specific facilities by IDs
✓ should handle multiple filters simultaneously
```

#### Contaminants Tool Specific Tests
```typescript
✓ should fetch all contaminants
✓ should filter contaminants by shipment IDs
✓ should filter contaminants by facility
✓ should filter contaminants by date range
✓ should filter contaminants by type (Lead, Mercury, etc.)
✓ should filter contaminants by risk level
✓ should handle multiple shipment IDs
✓ should handle complex filters
```

#### Inspections Tool Specific Tests
```typescript
✓ should fetch all inspections
✓ should filter inspections by status (accepted, rejected, pending)
✓ should filter inspections by date range
✓ should filter inspections by facility
✓ should filter inspections by shipment
✓ should filter inspections with risk contaminants
✓ should get accepted inspections from this week
✓ should handle multiple filters simultaneously
```

## Mock Data

### Available Test Fixtures

```typescript
import {
  mockShipments,       // 4 shipments
  mockFacilities,      // 3 facilities
  mockContaminants,    // 3 contaminants
  mockInspections,     // 4 inspections
} from '../fixtures/waste-data';
```

### Helper Functions

```typescript
// Get shipments with contaminants
const contaminated = getContaminatedShipments();

// Get shipments by date range
const recent = getShipmentsByDateRange('2025-10-04', '2025-10-11');

// Get facilities by location
const hannover = getFacilitiesByLocation('Hannover');

// Get high-risk contaminants
const dangerous = getHighRiskContaminants();

// Get rejected inspections
const rejected = getRejectedInspections();
```

## HTTP Mocking with Nock

All tests use `nock` to intercept HTTP requests:

```typescript
import nock from 'nock';

beforeEach(() => {
  // Setup mocks for each test
  nock('https://api.wasteer.dev')
    .get('/shipments')
    .query({ has_contaminants: 'true', limit: '100' })
    .reply(200, mockShipments.filter(s => s.has_contaminants));
});

afterEach(() => {
  // Clean up mocks after each test
  nock.cleanAll();
});
```

## Test Scenarios

### Scenario 1: Query Contaminated Shipments Last Week

```typescript
it('should handle the "last week contaminated shipments" query', async () => {
  // Mock shipments API
  nock(apiUrl)
    .get('/shipments')
    .query({ 
      date_from: '2025-10-04',
      date_to: '2025-10-11',
      has_contaminants: 'true',
      limit: '100'
    })
    .reply(200, mockShipments.filter(s => 
      s.has_contaminants &&
      s.date >= '2025-10-04' &&
      s.date <= '2025-10-11'
    ));
  
  const result = await shipmentsTool.execute({
    date_from: '2025-10-04',
    date_to: '2025-10-11',
    has_contaminants: true
  });
  
  expect(result.success).toBe(true);
  expect(result.data.length).toBeGreaterThan(0);
});
```

### Scenario 2: Analyse Contaminants in Hannover

```typescript
it('should handle "contaminants in Hannover" query', async () => {
  // Step 1: Get Hannover facility
  nock(apiUrl)
    .get('/facilities')
    .query({ location: 'Hannover' })
    .reply(200, mockFacilities.filter(f => f.location === 'Hannover'));
  
  const facilitiesResult = await facilitiesTool.execute({ 
    location: 'Hannover' 
  });
  
  const facilityId = facilitiesResult.data[0].id;
  
  // Step 2: Get contaminants for that facility
  nock(apiUrl)
    .get('/contaminants-detected')
    .query({ facility_id: facilityId })
    .reply(200, mockContaminants.filter(c => c.facility_id === facilityId));
  
  const contaminantsResult = await contaminantsTool.execute({ 
    facility_id: facilityId 
  });
  
  expect(contaminantsResult.success).toBe(true);
});
```

### Scenario 3: Rejected Inspections This Month

```typescript
it('should get rejected inspections for the month', async () => {
  nock(apiUrl)
    .get('/inspections')
    .query({
      status: 'rejected',
      date_from: '2025-10-01',
      date_to: '2025-10-31'
    })
    .reply(200, mockInspections.filter(i => 
      i.status === 'rejected' &&
      i.date >= '2025-10-01' &&
      i.date <= '2025-10-31'
    ));
  
  const result = await inspectionsTool.execute({
    status: 'rejected',
    date_from: '2025-10-01',
    date_to: '2025-10-31'
  });
  
  expect(result.success).toBe(true);
  expect(result.data.every(i => i.status === 'rejected')).toBe(true);
});
```

## Error Handling Tests

### API Errors

```typescript
it('should handle 500 errors gracefully', async () => {
  nock(apiUrl)
    .get('/shipments')
    .query(true)
    .reply(500, { error: 'Internal Server Error' });
  
  const result = await tool.execute({});
  
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('500');
  expect(result.error?.message).toBeDefined();
});
```

### Network Errors

```typescript
it('should handle network failures', async () => {
  nock(apiUrl)
    .get('/facilities')
    .query(true)
    .replyWithError('Connection timeout');
  
  const result = await tool.execute({});
  
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('UNKNOWN');
  expect(result.error?.message).toContain('Connection timeout');
});
```

## Coverage Goals

### Current Coverage (Tool Layer)

| Component | Coverage |
|-----------|----------|
| MCP Server | ~95% |
| Shipments Tool | ~100% |
| Facilities Tool | ~100% |
| Contaminants Tool | ~100% |
| Inspections Tool | ~100% |
| Type Definitions | N/A |

### Running Coverage Report

```bash
yarn test:coverage
```

Output includes:
- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: yarn install
      - run: yarn test --coverage
```

## Debugging Tests

### VSCode Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "${fileBasename}",
    "--config",
    "jest.config.cjs"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

**Issue: Tests fail with "module not found"**
- Solution: Check import paths use `.js` extension for ESM
- Ensure `jest.config.cjs` has correct `moduleNameMapper`

**Issue: Nock not intercepting requests**
- Solution: Ensure `nock.cleanAll()` in `afterEach()`
- Check URL and query params match exactly

**Issue: Type errors in tests**
- Solution: Update `tsconfig.json` to include test files
- Ensure `@types/jest` is installed

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` for setup, `afterEach` for cleanup
- Don't rely on test execution order

### 2. Descriptive Test Names
```typescript
// ✅ Good
it('should filter shipments with contaminants', async () => {});

// ❌ Bad
it('test shipments', async () => {});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  nock(apiUrl).get('/shipments').reply(200, mockShipments);
  
  // Act: Execute the code under test
  const result = await tool.execute({});
  
  // Assert: Verify the results
  expect(result.success).toBe(true);
});
```

### 4. Test Both Success and Failure Paths
```typescript
describe('ShipmentsTool', () => {
  it('should succeed with valid params', async () => {
    // Test happy path
  });
  
  it('should fail with invalid API response', async () => {
    // Test error path
  });
});
```

## Next Steps

When implementing agents, add:

- [ ] Planner agent tests (plan generation)
- [ ] Executor agent tests (parallel execution)
- [ ] Analyzer agent tests (pattern detection)
- [ ] Summarizer agent tests (response formatting)
- [ ] Integration tests (full pipeline)
- [ ] Memory system tests (Neo4j, Pinecone)
- [ ] LLM provider tests (with mocked LLM responses)

## Summary

✅ **47 tests, all passing**  
✅ **~100% coverage for tools**  
✅ **Comprehensive error handling**  
✅ **Real-world scenarios tested**  
✅ **CI/CD ready**

The test suite ensures that the MCP server and tools are **production-ready** and **reliably testable**.

