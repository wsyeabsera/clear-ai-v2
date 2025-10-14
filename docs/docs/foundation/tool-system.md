---
sidebar_position: 4
---

# Tool System & Registry

Clear AI v2 has a sophisticated tool system with **56 tools** that can perform real-world actions on your data. The system automatically discovers, organizes, and makes these tools available to agents through a centralized registry.

## What Are Tools?

**Tools** are like specialized workers that can:
- **Query databases** - Get shipments, facilities, contaminants, inspections
- **Analyze data** - Calculate contamination rates, facility performance metrics
- **Create reports** - Generate compliance reports, risk assessments
- **Manage relationships** - Handle contracts, waste producers, shipment compositions
- **Perform analytics** - Statistical analysis, trend detection, anomaly identification

Think of tools as the "hands" of your AI agents - they can actually **do things** with your data, not just talk about it.

## The 56 Tools

The system includes 56 tools organized across 8 API endpoints:

### Core Data Tools (40 tools)
- **Shipments** (7 tools): List, get, create, update, delete, get-with-contaminants, get-detailed
- **Facilities** (7 tools): List, get, create, update, delete, get-detailed, get-with-activity  
- **Contaminants** (5 tools): List, get, create, update, delete
- **Inspections** (6 tools): List, get, create, update, delete, get-detailed
- **Contracts** (5 tools): List, get, create, update, delete
- **Waste Producers** (6 tools): List, get, create, update, delete, get-compliance-report
- **Shipment Compositions** (4 tools): List, get, create, update
- **Shipment Loads** (4 tools): List, get, create, update

### Analytics Tools (4 tools)
- **Contamination Rate Analytics** - Overall contamination statistics
- **Facility Performance Analytics** - Acceptance/rejection rates by facility
- **Waste Distribution Analytics** - Waste type distribution and contamination rates
- **Risk Trends Analytics** - Contaminant risk trends over time

### Management Tools (2 tools)
- **Database Reset** - Reset database and seed with test data
- **Analytics** - Combined analytics operations

## Tool Registry: The Key Innovation

The **Tool Registry** is what makes Clear AI v2 special. Instead of hardcoding tool lists, the system automatically:

### 🔍 **Discovers Tools**
```typescript
const toolRegistry = new ToolRegistry('http://localhost:4000/api');
await toolRegistry.initialize(); // Automatically finds all 56 tools
```

### 📋 **Organizes Tools**
- **By Category**: Data, Analytics, Management
- **By Intent**: CREATE, READ, UPDATE, DELETE, ANALYZE
- **By Relationships**: Which tools work together

### ✅ **Validates Tools**
- Parameter validation against schemas
- Tool availability checking
- Dependency resolution

### 🚀 **Makes Tools Available**
- Agents automatically know about all tools
- No hardcoding required
- Add new tools without touching agent code

## How Tools Work

### 1. Tool Discovery Process

When the registry initializes:

1. **Scans** the `/src/tools` directory for tool files
2. **Imports** each tool module dynamically
3. **Detects** classes extending `BaseTool`
4. **Extracts** schemas and parameters
5. **Registers** tools in the central registry

### 2. Tool Execution Flow

```typescript
// 1. Agent requests a tool
const tool = toolRegistry.getToolInstance('shipments_list');

// 2. Registry validates parameters
const validation = toolRegistry.validateParameters('shipments_list', {
  facility_id: 'F123',
  has_contaminants: true
});

// 3. Tool executes with validated parameters
const result = await tool.execute(validatedParams);

// 4. Result is cached for future use
toolRegistry.cacheResult('shipments_list', validatedParams, result);
```

### 3. Tool Categories & Relationships

The registry organizes tools into **5 categories**:

#### **Data Management**
- **CRUD Operations**: Create, read, update, delete for all entities
- **Relationship Tools**: Get entities with related data
- **Examples**: `shipments_list`, `facilities_get_detailed`

#### **Analytics & Reporting**
- **Statistical Analysis**: Contamination rates, performance metrics
- **Trend Analysis**: Risk trends, distribution patterns
- **Examples**: `analytics_contamination_rate`, `analytics_facility_performance`

#### **Compliance & Validation**
- **Contract Validation**: Check compliance with contracts
- **Risk Assessment**: Identify high-risk contaminants
- **Examples**: `producers_get_compliance_report`, `analytics_risk_trends`

#### **Multi-Entity Operations**
- **Cross-Resource Queries**: Combine data from multiple sources
- **Complex Relationships**: Shipments with contaminants and inspections
- **Examples**: `shipments_get_with_contaminants`, `facilities_get_with_activity`

#### **System Management**
- **Database Operations**: Reset, seed, maintenance
- **System Analytics**: Overall system health and performance
- **Examples**: `database_reset`, `analytics_*`

## Tool Parameters & Validation

### Parameter Types

Tools accept various parameter types:

```typescript
// String parameters
{ facility_id: "F123", carrier: "Green Logistics" }

// Boolean parameters  
{ has_contaminants: true, passed: false }

// Date parameters
{ date_from: "2024-01-01", date_to: "2024-01-31" }

// Numeric parameters
{ limit: 50, concentration_ppm: 150 }

// Array parameters
{ shipment_ids: ["S1", "S2", "S3"] }
```

### Validation Rules

The registry validates all parameters:

- **Required vs Optional**: Some parameters are mandatory
- **Type Checking**: Strings, numbers, booleans, arrays
- **Range Validation**: Min/max values for numeric parameters
- **Enum Validation**: Allowed values for categorical parameters
- **Format Validation**: Date formats, ID patterns

### Error Handling

When validation fails:

```typescript
// Invalid parameter
const validation = toolRegistry.validateParameters('shipments_list', {
  facility_id: 123, // Should be string, not number
  limit: -5         // Should be positive
});

// Returns validation errors
console.log(validation.errors);
// [
//   "facility_id must be a string",
//   "limit must be greater than 0"
// ]
```

## Tool Caching & Performance

### Query Result Caching

Tools automatically cache results for better performance:

```typescript
// First call: Hits database
const shipments = await toolRegistry.executeTool('shipments_list', {
  facility_id: 'F123'
}); // Takes 200ms

// Second call: Uses cache
const shipments2 = await toolRegistry.executeTool('shipments_list', {
  facility_id: 'F123'  
}); // Takes 5ms (cached)
```

### Cache Configuration

- **TTL**: 5 minutes default cache lifetime
- **Size**: LRU eviction when cache is full
- **Invalidation**: Smart cache invalidation on mutations
- **Hit Rate**: Typically 40%+ cache hit rate in production

### Performance Metrics

```typescript
const stats = toolRegistry.getCacheStats();
console.log(stats);
// {
//   hitRate: 0.42,
//   totalRequests: 1000,
//   cacheHits: 420,
//   cacheMisses: 580,
//   averageResponseTime: 150
// }
```

## Tool Relationships & Combinations

### Complementary Tools

Some tools work better together:

```typescript
// Contract validation requires multiple tools
const contractValidation = [
  'contracts_list',           // Get contracts
  'waste_producers_list',     // Get producers  
  'shipment_loads_list',      // Get shipment loads
  'producers_get_compliance_report' // Generate compliance report
];
```

### Required Tool Chains

Complex operations need specific tool sequences:

```typescript
// Multi-step analysis
const analysisChain = [
  'facilities_list',          // Step 1: Get facilities
  'shipments_list',           // Step 2: Get shipments (depends on Step 1)
  'contaminants_list',        // Step 3: Get contaminants (depends on Step 2)
  'analytics_contamination_rate' // Step 4: Analyze (depends on Step 3)
];
```

### Tool Dependencies

The registry tracks which tools depend on others:

```typescript
// shipments_get_with_contaminants depends on:
const dependencies = [
  'shipments_get',     // Get shipment data
  'contaminants_list'  // Get related contaminants
];
```

## Examples

### Simple Tool Usage

```typescript
// Get all contaminated shipments
const contaminatedShipments = await toolRegistry.executeTool('shipments_list', {
  has_contaminants: true,
  limit: 50
});

console.log(`Found ${contaminatedShipments.length} contaminated shipments`);
```

### Complex Multi-Tool Query

```typescript
// Analyze facility performance
const facilities = await toolRegistry.executeTool('facilities_list', {
  location: 'Berlin'
});

const shipments = await toolRegistry.executeTool('shipments_list', {
  facility_id: facilities[0].id,
  date_from: '2024-01-01'
});

const analytics = await toolRegistry.executeTool('analytics_facility_performance', {
  facility_ids: facilities.map(f => f.id)
});

console.log(`Berlin facilities: ${facilities.length}`);
console.log(`Total shipments: ${shipments.length}`);
console.log(`Acceptance rate: ${analytics.acceptanceRate}%`);
```

### Tool with Step References

```typescript
// Use results from previous step
const plan = [
  {
    tool: 'facilities_list',
    params: { location: 'Berlin' }
  },
  {
    tool: 'shipments_list', 
    params: { 
      facility_id: '${step[0].data.*.id}', // Use facility IDs from step 0
      has_contaminants: true
    },
    depends_on: [0]
  }
];

const results = await executor.executePlan(plan);
```

## Best Practices

### Tool Selection

- **Use specific tools** when you know exactly what you need
- **Use relationship tools** for comprehensive data (`get_detailed`, `get_with_contaminants`)
- **Use analytics tools** for statistical analysis and reporting

### Parameter Optimization

- **Set reasonable limits** to prevent oversized responses
- **Use date ranges** for time-based queries
- **Filter by specific criteria** to reduce data volume

### Performance Optimization

- **Leverage caching** by using consistent parameter patterns
- **Use parallel execution** for independent tools
- **Batch related operations** to reduce round trips

### Error Handling

- **Validate parameters** before execution
- **Handle tool failures** gracefully
- **Provide meaningful error messages** to users

## Integration with Agents

### Planner Agent

The Planner uses the tool registry to:
- **Select appropriate tools** for user queries
- **Create execution plans** with proper dependencies
- **Validate tool combinations** before execution

### Executor Agent

The Executor uses the tool registry to:
- **Execute tools** with validated parameters
- **Handle tool failures** and retries
- **Cache results** for performance optimization

### Analyzer Agent

The Analyzer uses tool results to:
- **Detect patterns** in the data
- **Identify anomalies** and outliers
- **Generate insights** from tool outputs

## What's Next?

Now that you understand the tool system:

- 🤖 [**Agent System**](../agents/overview.md) - Learn how agents use tools
- ⚙️ [**Agent Configuration**](../guides/agent-configuration.md) - Customize tool usage
- 🚀 [**Intelligence Upgrades**](../guides/intelligence-upgrades.md) - Learn about tool relationship mapping
- 🧪 [**Testing**](../guides/testing.md) - Test your tool integrations

---

**Questions?** Check the [guides](../guides/environment-setup.md) or specific tool documentation.
