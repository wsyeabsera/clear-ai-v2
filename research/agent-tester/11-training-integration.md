# Agent Tester - Training Module Integration

## Overview

The Agent Tester serves as the foundation for a future Training Module that will enable continuous improvement of the agent system through feedback collection, performance tracking, and model fine-tuning.

## Vision

Transform the Agent Tester from a validation tool into a continuous learning system that:
- Collects high-quality training data from tests
- Tracks model performance over time
- Enables systematic model improvement
- Supports A/B testing of different approaches
- Creates feedback loops for optimization

## Data Collection for Training

### Query-Response Pairs

```typescript
interface TrainingExample {
  // Input
  query: string;
  context?: any;
  userId?: string;
  timestamp: string;
  
  // Output
  response: ExecutionResult;
  
  // Metadata
  toolsUsed: string[];
  analysis: Analysis;
  
  // Quality labels
  labels: {
    correctToolSelection: boolean;
    responseQuality: number;  // 0-5 scale
    userSatisfaction?: number;  // If available
    validationConfidence: number;
  };
  
  // Performance
  metrics: {
    latencyMs: number;
    tokenUsage: number;
    cost: number;
  };
}

// Collect during test runs
class TrainingDataCollector {
  async collect(testResult: TestResult): Promise<void> {
    const example: TrainingExample = {
      query: testResult.scenario.query,
      response: testResult.result,
      toolsUsed: testResult.result.toolsUsed,
      analysis: testResult.result.analysis,
      labels: {
        correctToolSelection: testResult.validation.details
          .find(d => d.type === 'tool_selection')?.passed || false,
        responseQuality: assessResponseQuality(testResult),
        validationConfidence: testResult.validation.confidence
      },
      metrics: {
        latencyMs: testResult.metrics.totalLatencyMs,
        tokenUsage: testResult.metrics.tokenUsage.totalTokens,
        cost: testResult.metrics.cost.totalCost
      },
      timestamp: new Date().toISOString()
    };
    
    await this.storage.save(example);
  }
}
```

### Feedback Collection

```typescript
interface Feedback {
  exampleId: string;
  rating: number;  // 1-5
  aspects: {
    toolSelection: number;  // 1-5
    responseQuality: number;  // 1-5
    speed: number;  // 1-5
  };
  comments?: string;
  suggestedTools?: string[];
  suggestedResponse?: string;
}

// CLI for manual feedback
// yarn feedback:add --example ex-12345 --rating 4 --comment "Good but slow"
```

## Training Use Cases

### 1. Tool Selection Improvement

**Goal:** Improve planner's tool selection accuracy

**Approach:**
- Collect query → tools_used pairs
- Label correctness (from validation)
- Fine-tune model on correct examples
- A/B test improved model

**Data Preparation:**
```typescript
function prepareToolSelectionData(examples: TrainingExample[]): FineTuneData[] {
  return examples
    .filter(e => e.labels.correctToolSelection)
    .map(e => ({
      messages: [
        {
          role: 'system',
          content: PLANNER_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Query: ${e.query}`
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            tools: e.toolsUsed,
            reasoning: extractReasoning(e.response)
          })
        }
      ]
    }));
}
```

### 2. Response Quality Improvement

**Goal:** Improve summarizer output

**Approach:**
- Collect high-quality responses (>4.0 rating)
- Collect low-quality responses (<3.0 rating)
- Train to maximize quality
- Validate improvement

**Data Preparation:**
```typescript
function prepareSummarizerData(examples: TrainingExample[]): FineTuneData[] {
  const highQuality = examples.filter(e => e.labels.responseQuality >= 4.0);
  
  return highQuality.map(e => ({
    messages: [
      {
        role: 'system',
        content: SUMMARIZER_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Query: ${e.query}\n\nAnalysis: ${JSON.stringify(e.analysis)}`
      },
      {
        role: 'assistant',
        content: e.response.message
      }
    ]
  }));
}
```

### 3. Error Recovery Improvement

**Goal:** Better error handling

**Approach:**
- Collect queries that caused errors
- Label with correct recovery strategy
- Train model to handle gracefully

**Data Structure:**
```typescript
interface ErrorRecoveryExample {
  query: string;
  errorType: string;
  correctResponse: string;
  incorrectResponse?: string;
  recoveryStrategy: 'clarify' | 'retry' | 'fallback' | 'graceful_fail';
}
```

## A/B Testing Framework

### Model Comparison

```typescript
interface ABTestConfig {
  modelA: {
    name: string;
    config: LLMConfig;
  };
  modelB: {
    name: string;
    config: LLMConfig;
  };
  scenarios: Scenario[];
  metrics: string[];
}

async function runABTest(config: ABTestConfig): Promise<ABTestResult> {
  const resultsA = await runTestsWithModel(config.modelA, config.scenarios);
  const resultsB = await runTestsWithModel(config.modelB, config.scenarios);
  
  return {
    modelA: {
      name: config.modelA.name,
      avgLatency: average(resultsA.map(r => r.metrics.totalLatencyMs)),
      avgCost: average(resultsA.map(r => r.metrics.cost.totalCost)),
      successRate: resultsA.filter(r => r.success).length / resultsA.length,
      avgQuality: average(resultsA.map(r => r.validation.confidence))
    },
    modelB: {
      name: config.modelB.name,
      avgLatency: average(resultsB.map(r => r.metrics.totalLatencyMs)),
      avgCost: average(resultsB.map(r => r.metrics.cost.totalCost)),
      successRate: resultsB.filter(r => r.success).length / resultsB.length,
      avgQuality: average(resultsB.map(r => r.validation.confidence))
    },
    winner: determineWinner(resultsA, resultsB),
    recommendation: generateRecommendation(resultsA, resultsB)
  };
}
```

**Usage:**
```bash
# Compare GPT-3.5 vs GPT-4
yarn ab:test --model-a gpt-3.5-turbo --model-b gpt-4-turbo-preview --scenarios all

# Compare different temperatures
yarn ab:test --config-a temp-0.3 --config-b temp-0.7
```

## Performance Tracking Over Time

### Continuous Monitoring

```typescript
interface PerformanceTracker {
  trackRun(runId: string, results: TestResults): void;
  getHistory(days: number): HistoricalData[];
  detectTrends(): Trend[];
  predictFuture(days: number): Prediction[];
}

// Track model improvements
async function trackModelVersion(version: string, results: TestResults): Promise<void> {
  await db.insert({
    modelVersion: version,
    timestamp: Date.now(),
    metrics: {
      avgLatency: results.avgLatency,
      avgCost: results.avgCost,
      successRate: results.successRate,
      avgQuality: results.avgQuality
    }
  });
}

// View improvement over time
// yarn training:history --metric quality --days 90
```

### Regression Detection for Model Changes

```typescript
function detectModelRegression(
  previousVersion: TestResults,
  currentVersion: TestResults
): RegressionReport {
  const regressions = [];
  
  // Quality regression
  if (currentVersion.avgQuality < previousVersion.avgQuality * 0.95) {
    regressions.push({
      type: 'quality',
      severity: 'high',
      message: 'Quality decreased by >5%'
    });
  }
  
  // Cost regression
  if (currentVersion.avgCost > previousVersion.avgCost * 1.20) {
    regressions.push({
      type: 'cost',
      severity: 'medium',
      message: 'Cost increased by >20%'
    });
  }
  
  return {
    regressions,
    recommendation: regressions.length > 0 ? 'REJECT' : 'APPROVE'
  };
}
```

## Fine-Tuning Pipeline

### Data Export for Fine-Tuning

```bash
# Export training data in OpenAI format
yarn training:export --format openai --output training-data.jsonl

# Filter by quality
yarn training:export --min-quality 4.0 --output high-quality.jsonl

# Export specific agent data
yarn training:export --agent planner --output planner-data.jsonl
```

**Output Format (OpenAI):**
```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

### Training Workflow

```bash
# 1. Collect data over time
yarn test:run --all --collect-training-data

# 2. Review collected data
yarn training:review

# 3. Filter and prepare
yarn training:prepare --min-quality 4.0 --min-confidence 0.9

# 4. Export for fine-tuning
yarn training:export --output planner-fine-tune.jsonl

# 5. Fine-tune (using OpenAI CLI or API)
openai api fine_tunes.create -t planner-fine-tune.jsonl -m gpt-3.5-turbo

# 6. Test fine-tuned model
yarn ab:test --model-a gpt-3.5-turbo --model-b ft:gpt-3.5-turbo:my-fine-tune

# 7. Deploy if better
yarn model:deploy --model ft:gpt-3.5-turbo:my-fine-tune
```

## Feedback Loop Architecture

```
┌─────────────┐
│ Agent Tests │ ──┐
└─────────────┘   │
                  │ Collect
┌─────────────┐   │ Examples
│  Real Usage │ ──┤
└─────────────┘   │
                  ▼
            ┌─────────────┐
            │  Training   │
            │  Database   │
            └─────────────┘
                  │
                  │ Filter & Prepare
                  ▼
            ┌─────────────┐
            │  Fine-Tune  │
            │   Pipeline  │
            └─────────────┘
                  │
                  │ New Model
                  ▼
            ┌─────────────┐
            │   A/B Test  │
            │   w/ Tester │
            └─────────────┘
                  │
                  │ If Better
                  ▼
            ┌─────────────┐
            │   Deploy    │
            │  New Model  │
            └─────────────┘
```

## Metrics for Training

### Track What Matters

```typescript
interface TrainingMetrics {
  // Model performance
  modelAccuracy: number;
  taskCompletionRate: number;
  
  // User satisfaction (from feedback)
  avgUserRating: number;
  positiveRate: number;
  
  // Efficiency
  avgTokensPerQuery: number;
  avgCostPerQuery: number;
  
  // Quality indicators
  toolSelectionAccuracy: number;
  analysisRelevance: number;
  responseHelpfulness: number;
}
```

### Success Criteria for Model Updates

A new model should:
- ✅ Maintain or improve accuracy (>= 95% of baseline)
- ✅ Not significantly increase latency (< 110% of baseline)
- ✅ Not significantly increase cost (< 120% of baseline)
- ✅ Pass all regression tests
- ✅ Improve on at least one key metric

## Future Enhancements

### Reinforcement Learning

Collect reward signals:
```typescript
interface RewardSignal {
  exampleId: string;
  reward: number;  // -1 to +1
  components: {
    correctness: number;
    speed: number;
    cost: number;
    userSatisfaction: number;
  };
}
```

### Active Learning

Identify valuable examples to label:
```typescript
function selectExamplesForLabeling(
  examples: TrainingExample[]
): TrainingExample[] {
  // Select examples where model is uncertain
  return examples
    .filter(e => e.labels.validationConfidence < 0.7)
    .sort((a, b) => a.labels.validationConfidence - b.labels.validationConfidence)
    .slice(0, 100);
}
```

### Online Learning

Update model incrementally:
```typescript
class OnlineLearner {
  async updateModel(newExamples: TrainingExample[]): Promise<void> {
    // Incremental fine-tuning
    const formattedData = prepareData(newExamples);
    await continueFine Tuning(currentModel, formattedData);
    
    // Validate improvement
    const testResults = await runValidationTests();
    
    if (testResults.quality > currentModelQuality) {
      await deployModel();
    }
  }
}
```

## Integration Points

### 1. Data Collection

Agent Tester already collects:
- ✅ Query-response pairs
- ✅ Validation results
- ✅ Performance metrics
- ✅ Cost data

Need to add:
- User feedback mechanism
- Manual labeling interface
- Quality review process

### 2. Model Evaluation

Agent Tester provides:
- ✅ Automated testing
- ✅ Regression detection
- ✅ A/B testing framework
- ✅ Performance benchmarking

### 3. Deployment Pipeline

```bash
# Test new model
yarn model:test --model new-model --scenarios all

# Compare with production
yarn model:compare --baseline production --candidate new-model

# Gradual rollout
yarn model:deploy --model new-model --rollout 10%  # 10% of traffic
yarn model:monitor --duration 24h
yarn model:deploy --model new-model --rollout 50%  # if successful
yarn model:deploy --model new-model --rollout 100%
```

## Timeline

### Phase 1: Data Collection (Month 1-2)
- Use Agent Tester as-is
- Collect test results
- Add feedback mechanism
- Build training database

### Phase 2: Initial Fine-Tuning (Month 3)
- Prepare first training dataset (1000+ examples)
- Fine-tune planner model
- A/B test results
- Deploy if improved

### Phase 3: Continuous Learning (Month 4+)
- Automated data collection
- Weekly model updates
- Automated A/B testing
- Continuous deployment

### Phase 4: Advanced Training (Month 6+)
- Reinforcement learning
- Active learning
- Multi-agent coordination training
- Custom model architecture

## Success Metrics

Track improvement over time:

```typescript
interface ImprovementMetrics {
  baseline: {
    toolAccuracy: 0.90,
    responseQuality: 3.5,
    avgCost: 0.025
  },
  
  afterMonth1: {
    toolAccuracy: 0.92,  // +2%
    responseQuality: 3.7,  // +5.7%
    avgCost: 0.023  // -8%
  },
  
  afterMonth3: {
    toolAccuracy: 0.95,  // +5.6%
    responseQuality: 4.1,  // +17%
    avgCost: 0.020  // -20%
  },
  
  afterMonth6: {
    toolAccuracy: 0.97,  // +7.8%
    responseQuality: 4.4,  // +25.7%
    avgCost: 0.018  // -28%
  }
}
```

## Implementation Checklist

### Prerequisites
- ✅ Agent Tester fully operational
- ✅ Collecting comprehensive metrics
- ✅ 200+ scenarios running regularly
- ✅ Baseline performance established

### Phase 1 Implementation
- [ ] Add training data export
- [ ] Create training database schema
- [ ] Build feedback collection interface
- [ ] Implement data quality filtering

### Phase 2 Implementation
- [ ] Prepare fine-tuning datasets
- [ ] Set up fine-tuning pipeline
- [ ] Implement A/B testing
- [ ] Create deployment automation

### Phase 3 Implementation
- [ ] Automate data collection
- [ ] Schedule regular model updates
- [ ] Implement continuous testing
- [ ] Build monitoring dashboard

## Considerations

### Data Quality
- Only use validated, high-confidence examples
- Manual review of training data
- Remove outliers and anomalies
- Balance dataset (avoid bias)

### Privacy
- No user PII in training data
- Synthetic data generation
- Data anonymization
- Compliance with regulations

### Costs
- Fine-tuning costs ($)
- Compute for training
- A/B testing overhead
- Storage for training data

### Validation
- Hold-out test set
- Cross-validation
- Production A/B tests
- Regression testing

---

**End of Blueprints** - You now have a complete design for the Agent Tester system!

**Next Steps:**
1. Review all blueprints
2. Provide feedback and refinements
3. Begin Phase 1 implementation
4. Iterate and improve

**Back to Start:** [README.md](./README.md)

