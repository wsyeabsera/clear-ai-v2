# Agent Tester - Scenario Generator

## Overview

The Scenario Generator creates test scenarios automatically using various strategies. This expands test coverage, discovers edge cases, and reduces manual scenario authoring effort.

## Generation Strategies

### 1. Template-Based Generation

**Concept:** Fill templates with variable values to create scenario variations

**Template Format:**
```yaml
template:
  name: "{{action}} {{entity}} from {{timeframe}}"
  query: "{{action}} {{entity}} from {{timeframe}}"
  expectedBehavior:
    toolsUsed: ["{{entity_tool}}"]
    maxLatencyMs: 5000

variables:
  action:
    - Get
    - Show
    - List
    - Find
  entity:
    - shipments
    - facilities
    - contaminants
    - inspections
  timeframe:
    - last week
    - last month
    - today
    - yesterday
  entity_tool:
    shipments: shipments
    facilities: facilities
    contaminants: contaminants
    inspections: inspections
```

**Generation:**
```typescript
interface TemplateGenerator {
  generate(template: Template): Scenario[];
}

// Generates: 4 actions × 4 entities × 4 timeframes = 64 scenarios
```

**Use Cases:**
- Systematic coverage of tool combinations
- Different phrasings of same query
- Parameter variations
- Localization testing

### 2. Combinatorial Testing

**Concept:** Test all combinations of tools, filters, and parameters

**Configuration:**
```typescript
interface CombinatorialConfig {
  tools: string[];
  filters: {
    [tool: string]: {
      [param: string]: any[];
    };
  };
  maxCombinations?: number;
}
```

**Example:**
```typescript
const config = {
  tools: ['shipments', 'contaminants'],
  filters: {
    shipments: {
      status: ['delivered', 'rejected', 'pending'],
      has_contaminants: [true, false],
      date_range: ['last week', 'last month', 'today']
    },
    contaminants: {
      risk_level: ['low', 'medium', 'high', 'critical'],
      type: ['Lead', 'Mercury', 'Plastic']
    }
  }
};

// Generates scenarios for all meaningful combinations
```

**Algorithm:**
```typescript
function generateCombinatorial(config: CombinatorialConfig): Scenario[] {
  const scenarios: Scenario[] = [];
  
  for (const tool of config.tools) {
    const filters = config.filters[tool];
    const combinations = cartesianProduct(filters);
    
    for (const combo of combinations) {
      scenarios.push(createScenario(tool, combo));
    }
  }
  
  return scenarios;
}
```

**Optimization:**
- Pairwise testing (test all pairs, not all combinations)
- Prioritize critical combinations
- Skip redundant combinations
- Limit total scenarios

### 3. Fuzz Testing

**Concept:** Generate random/invalid inputs to test robustness

**Fuzzing Strategies:**

**a) String Fuzzing**
```typescript
const stringFuzzers = [
  // Empty and whitespace
  '',
  '   ',
  '\n\n\n',
  
  // Special characters
  '!@#$%^&*()',
  '<script>alert(1)</script>',
  '"; DROP TABLE shipments; --',
  
  // Unicode
  '你好世界',
  '🚀🎉💻',
  
  // Very long strings
  'A'.repeat(10000),
  
  // Malformed dates
  '2025-13-40',
  'yesterday tomorrow',
  '99999999999999'
];
```

**b) Parameter Fuzzing**
```typescript
const parameterFuzzers = {
  integers: [-1, 0, 9999999, NaN, Infinity],
  booleans: ['true', 'false', 1, 0, null],
  arrays: [[], null, ['invalid'], [1,2,3,...1000]],
  objects: [{}, null, {invalid: 'key'}]
};
```

**c) Query Fuzzing**
```typescript
function generateFuzzedQueries(count: number): string[] {
  return [
    // Nonsense
    'asdf qwerty zxcv',
    
    // Mixed languages
    'Get shipments desde last week из Berlin',
    
    // Contradictions
    'Get shipments that are both delivered and rejected',
    
    // Impossible requests
    'Get shipments from next week',
    'Show me facilities in Atlantis',
    
    // Extremely long queries
    generateLongQuery(5000),
    
    // Ambiguous
    'Get them from there',
    'Show me stuff'
  ];
}
```

**Use Cases:**
- Security testing
- Error handling validation
- Edge case discovery
- Robustness validation

### 4. LLM-Based Generation

**Concept:** Use language models to generate realistic test queries

**Prompt Template:**
```typescript
const prompt = `
Generate ${count} realistic user queries for a waste management system.

The system has these capabilities:
- Query shipments (by date, status, facility, contamination)
- Search facilities (by location, type, capacity)
- Analyze contaminants (by type, risk level, shipment)
- Review inspections (by status, date, facility)

Generate queries that:
1. Sound natural and realistic
2. Cover different complexity levels
3. Include various phrasings
4. Test different features

Output format:
{
  "queries": [
    {"query": "...", "complexity": "simple|complex", "expectedTools": ["..."]},
    ...
  ]
}
`;
```

**Generation:**
```typescript
async function generateLLMScenarios(count: number): Promise<Scenario[]> {
  const response = await llm.generate({
    messages: [{
      role: 'user',
      content: promptTemplate(count)
    }],
    config: {
      temperature: 0.8,  // Higher for diversity
      max_tokens: 2000
    }
  });
  
  const generated = JSON.parse(extractJSON(response.content));
  
  return generated.queries.map(q => ({
    id: generateId(),
    name: q.query.substring(0, 50),
    category: q.complexity,
    query: q.query,
    expectedBehavior: {
      toolsUsed: q.expectedTools,
      maxLatencyMs: 10000
    },
    validation: generateValidations(q)
  }));
}
```

**Advantages:**
- Natural language queries
- Realistic user phrasings
- Creative edge cases
- Diverse scenarios

**Configuration:**
```typescript
interface LLMGeneratorConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo';
  temperature: number;
  count: number;
  complexity?: 'simple' | 'complex' | 'mixed';
  focus?: string[];  // Focus areas
}
```

### 5. Adversarial Testing

**Concept:** Generate intentionally difficult queries to stress-test the system

**Strategies:**

**a) Ambiguous Queries**
```typescript
const ambiguousQueries = [
  'Get them',  // What is "them"?
  'Show me recent stuff',  // How recent? What stuff?
  'Check if they are okay',  // Who? What does "okay" mean?
];
```

**b) Contradictory Queries**
```typescript
const contradictoryQueries = [
  'Get shipments that are delivered but not yet sent',
  'Find facilities with infinite capacity',
  'Show contaminated shipments with no contaminants',
];
```

**c) Context-Heavy Queries**
```typescript
const contextHeavyQueries = [
  'What about the others?',  // Requires previous context
  'And the rest?',  // Implicit reference
  'Same for Berlin',  // Implicit operation + location
];
```

**d) Complex Logic**
```typescript
const complexLogicQueries = [
  'Get shipments from facilities in Berlin or Hamburg that were rejected last week but re-inspected this week and found clean',
  'Find all facilities that received contaminated shipments in January but not in February, grouped by region',
];
```

**e) Edge Timestamps**
```typescript
const edgeTimestamps = [
  'Get shipments from exactly midnight',
  'Show facilities between 23:59:59 and 00:00:01',
  'Find contaminants detected in the future',  // Should error
];
```

**Generation:**
```typescript
function generateAdversarialScenarios(): Scenario[] {
  return [
    ...ambiguousQueries,
    ...contradictoryQueries,
    ...contextHeavyQueries,
    ...complexLogicQueries,
    ...edgeTimestamps
  ].map(query => ({
    id: generateId(),
    name: `Adversarial: ${query.substring(0, 30)}`,
    category: 'edge-case',
    query,
    expectedBehavior: {
      // May succeed gracefully or fail appropriately
      maxLatencyMs: 10000
    },
    validation: [{
      type: 'error_handling',
      expectGracefulResponse: true
    }]
  }));
}
```

### 6. Data-Driven Generation

**Concept:** Generate scenarios based on actual usage patterns

**Data Sources:**

**a) Production Logs**
```typescript
interface UsageLog {
  timestamp: string;
  query: string;
  userId: string;
  success: boolean;
  latencyMs: number;
  toolsUsed: string[];
}

function generateFromLogs(logs: UsageLog[]): Scenario[] {
  // Extract common patterns
  const patterns = analyzePatterns(logs);
  
  // Generate scenarios for each pattern
  return patterns.map(pattern => ({
    id: generateId(),
    name: `Real query: ${pattern.type}`,
    category: 'simple',
    query: pattern.exampleQuery,
    expectedBehavior: {
      toolsUsed: pattern.toolsUsed,
      maxLatencyMs: pattern.p95Latency * 1.5
    }
  }));
}
```

**b) Failed Queries**
```typescript
function generateFromFailures(failures: UsageLog[]): Scenario[] {
  return failures.map(failure => ({
    id: generateId(),
    name: `Regression: ${failure.query.substring(0, 30)}`,
    category: 'edge-case',
    query: failure.query,
    tags: ['regression', 'previously-failed'],
    expectedBehavior: {
      // Should now succeed
      maxLatencyMs: 10000
    }
  }));
}
```

**c) User Feedback**
```typescript
interface Feedback {
  query: string;
  rating: number;
  comments: string;
}

function generateFromFeedback(feedback: Feedback[]): Scenario[] {
  // Focus on low-rated queries
  const poorResults = feedback.filter(f => f.rating < 3);
  
  return poorResults.map(f => ({
    id: generateId(),
    name: `Improvement: ${f.query}`,
    category: 'complex',
    query: f.query,
    validation: [{
      type: 'semantic',
      check: `Addresses user feedback: ${f.comments}`
    }]
  }));
}
```

## Generation Pipeline

```typescript
class ScenarioGenerator {
  async generateAll(config: GeneratorConfig): Promise<Scenario[]> {
    const scenarios: Scenario[] = [];
    
    // 1. Template-based (quick, comprehensive)
    if (config.enableTemplates) {
      scenarios.push(...this.generateFromTemplates());
    }
    
    // 2. Combinatorial (systematic coverage)
    if (config.enableCombinatorial) {
      scenarios.push(...this.generateCombinatorial());
    }
    
    // 3. Fuzz testing (edge cases)
    if (config.enableFuzzing) {
      scenarios.push(...this.generateFuzzed(config.fuzzCount));
    }
    
    // 4. LLM-based (realistic queries)
    if (config.enableLLM) {
      scenarios.push(...await this.generateWithLLM(config.llmCount));
    }
    
    // 5. Adversarial (stress testing)
    if (config.enableAdversarial) {
      scenarios.push(...this.generateAdversarial());
    }
    
    // 6. Data-driven (real patterns)
    if (config.usageData) {
      scenarios.push(...this.generateFromData(config.usageData));
    }
    
    // Deduplicate
    return this.deduplicate(scenarios);
  }
  
  private deduplicate(scenarios: Scenario[]): Scenario[] {
    const seen = new Set<string>();
    return scenarios.filter(s => {
      const key = `${s.query}:${s.expectedBehavior.toolsUsed.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
```

## Usage Examples

### CLI Commands

```bash
# Generate from templates
yarn generate --strategy template --output scenarios/generated/

# Generate with LLM
yarn generate --strategy llm --count 50 --output scenarios/generated/

# Generate all strategies
yarn generate --all --output scenarios/generated/

# Generate for specific tool
yarn generate --tool shipments --count 20

# Generate adversarial tests
yarn generate --strategy adversarial --output scenarios/edge-cases/
```

### Programmatic Usage

```typescript
import { ScenarioGenerator } from './generator';

const generator = new ScenarioGenerator();

// Generate 100 scenarios using multiple strategies
const scenarios = await generator.generateAll({
  enableTemplates: true,
  enableCombinatorial: true,
  enableFuzzing: true,
  fuzzCount: 20,
  enableLLM: true,
  llmCount: 30,
  enableAdversarial: true
});

// Save to files
await saveScenarios(scenarios, 'scenarios/generated/');
```

## Best Practices

1. **Start Small** - Generate 10-20 scenarios initially
2. **Review Generated** - Manually review before running
3. **Adjust Parameters** - Tune generation settings
4. **Mix Strategies** - Combine multiple approaches
5. **Track Quality** - Monitor generated scenario usefulness
6. **Iterate** - Improve generation based on results

## Quality Control

### Filtering Generated Scenarios

```typescript
function filterQuality(scenarios: Scenario[]): Scenario[] {
  return scenarios.filter(s => {
    // Remove duplicates
    if (isDuplicate(s)) return false;
    
    // Remove nonsensical queries
    if (isNonsense(s.query)) return false;
    
    // Remove impossible queries
    if (isImpossible(s.query)) return false;
    
    // Require minimum quality
    if (estimateQuality(s) < 0.6) return false;
    
    return true;
  });
}
```

### Manual Review Process

1. **Automated filtering** - Remove obvious bad scenarios
2. **Random sampling** - Review 10% manually
3. **Test execution** - Run and verify results
4. **Feedback loop** - Adjust generation parameters
5. **Approval** - Move approved scenarios to main library

---

**Next Document:** [04-graphql-client.md](./04-graphql-client.md) - GraphQL integration

