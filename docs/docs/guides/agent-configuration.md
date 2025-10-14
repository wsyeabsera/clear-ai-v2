---
sidebar_position: 2
---

# Agent Configuration System

Clear AI v2's agent configuration system lets you customize how agents think and respond. Different use cases need different behaviors - this system gives you the flexibility to optimize for speed, accuracy, tone, or specific business requirements.

## Why Configure Agents?

Think of agent configurations like **personality settings** for your AI:

- **Speed vs Accuracy**: Fast rule-based analysis OR deep LLM analysis
- **Output Format**: Structured templates OR natural language
- **Tone**: Professional reports OR casual summaries
- **Business Context**: Compliance-focused OR user-friendly explanations

### Real-World Examples

```typescript
// Compliance Officer needs detailed analysis
const complianceConfig = {
  analyzer: 'deep-analysis',    // Use LLM for thorough insights
  summarizer: 'professional',   // Formal tone, structured output
  confidence: 'high-threshold'  // Only report high-confidence findings
};

// Customer Service needs quick, friendly responses  
const customerConfig = {
  analyzer: 'fast-analysis',    // Use rules for speed
  summarizer: 'casual',         // Friendly tone, simple language
  confidence: 'medium-threshold' // Include more findings
};
```

## Configuration Concepts

### Agent Configs vs Strategies

**Agent Configs** are high-level settings that control:
- Which strategies to use
- Performance parameters
- Output preferences

**Strategies** are the actual implementations:
- **Analysis Strategies**: Rule-based vs LLM-based
- **Summarization Strategies**: Template-based vs LLM-based

### Configuration Hierarchy

```
Agent Config
├── LLM Settings (temperature, max tokens, model)
├── Strategy Selection (which strategies to use)
├── Performance Settings (timeouts, retries)
├── Output Preferences (format, tone, length)
└── Business Rules (thresholds, validation)
```

## Creating Analyzer Configurations

### Step 1: Choose Your Analysis Strategy

#### Rule-Based Strategy (Fast)
```typescript
const fastAnalyzerConfig = {
  name: "Fast Analysis",
  type: "analyzer",
  config: {
    llmConfig: {
      temperature: 0.1,
      maxTokens: 500,
      model: "gpt-3.5-turbo"
    },
    analysisStrategies: ["rule-based"],
    enableStatisticalAnalysis: true,
    anomalyThreshold: 2.0,
    minConfidence: 0.8
  }
};
```

**When to use**: Real-time dashboards, quick reports, high-volume queries

#### LLM-Based Strategy (Deep)
```typescript
const deepAnalyzerConfig = {
  name: "Deep Analysis", 
  type: "analyzer",
  config: {
    llmConfig: {
      temperature: 0.3,
      maxTokens: 2000,
      model: "gpt-4"
    },
    analysisStrategies: ["llm-based"],
    enableChainOfThought: true,
    enableSelfCritique: true,
    minConfidence: 0.6
  }
};
```

**When to use**: Complex analysis, compliance reports, detailed insights

#### Hybrid Strategy (Balanced)
```typescript
const hybridAnalyzerConfig = {
  name: "Balanced Analysis",
  type: "analyzer", 
  config: {
    llmConfig: {
      temperature: 0.2,
      maxTokens: 1000,
      model: "gpt-3.5-turbo"
    },
    analysisStrategies: ["rule-based", "llm-based"],
    enableStatisticalAnalysis: true,
    enableChainOfThought: true,
    anomalyThreshold: 1.5,
    minConfidence: 0.7
  }
};
```

**When to use**: General-purpose analysis, balanced speed and accuracy

### Step 2: Configure Analysis Parameters

#### Confidence Thresholds
```typescript
// High confidence - only report very certain findings
{ minConfidence: 0.9 }

// Medium confidence - report likely findings  
{ minConfidence: 0.7 }

// Low confidence - report all findings with disclaimers
{ minConfidence: 0.5 }
```

#### Anomaly Detection
```typescript
// Strict anomaly detection (2 standard deviations)
{ anomalyThreshold: 2.0 }

// Moderate anomaly detection (1.5 standard deviations)
{ anomalyThreshold: 1.5 }

// Sensitive anomaly detection (1.0 standard deviations)
{ anomalyThreshold: 1.0 }
```

#### Statistical Analysis
```typescript
// Enable comprehensive statistical analysis
{
  enableStatisticalAnalysis: true,
  enableTrendAnalysis: true,
  enableCorrelationAnalysis: true
}
```

### Step 3: Customize Prompts (Advanced)

```typescript
const customAnalyzerConfig = {
  name: "Custom Compliance Analysis",
  type: "analyzer",
  config: {
    // ... other settings ...
    promptTemplates: {
      systemPrompt: "You are a compliance expert analyzing waste management data. Focus on regulatory compliance and risk assessment.",
      chainOfThoughtPrompt: "Think step by step about compliance implications. What regulations might be violated?",
      validationPrompt: "Validate your analysis against industry standards and regulations."
    }
  }
};
```

## Creating Summarizer Configurations

### Step 1: Choose Your Summarization Strategy

#### Template-Based Strategy (Fast & Consistent)
```typescript
const templateSummarizerConfig = {
  name: "Template Summarizer",
  type: "summarizer",
  config: {
    llmConfig: {
      temperature: 0.1,
      maxTokens: 800,
      model: "gpt-3.5-turbo"
    },
    summarizationStrategies: ["template-based"],
    format: "markdown",
    tone: "professional",
    maxLength: 500,
    includeDetails: true
  }
};
```

**When to use**: Standard reports, consistent formatting, high-volume output

#### LLM-Based Strategy (Natural & Flexible)
```typescript
const llmSummarizerConfig = {
  name: "Natural Summarizer",
  type: "summarizer",
  config: {
    llmConfig: {
      temperature: 0.4,
      maxTokens: 1500,
      model: "gpt-4"
    },
    summarizationStrategies: ["llm-based"],
    format: "plain",
    tone: "casual",
    maxLength: 800,
    includeRecommendations: true
  }
};
```

**When to use**: Customer-facing content, flexible formatting, natural language

### Step 2: Configure Output Preferences

#### Format Options
```typescript
// Plain text - simple, readable
{ format: "plain" }

// Markdown - structured with headers and lists
{ format: "markdown" }

// JSON - structured data format
{ format: "json" }
```

#### Tone Options
```typescript
// Professional - formal, business-like
{ tone: "professional" }

// Technical - detailed, precise
{ tone: "technical" }

// Casual - friendly, conversational
{ tone: "casual" }
```

#### Length Control
```typescript
// Short summaries - 200-300 words
{ maxLength: 300 }

// Medium summaries - 500-800 words  
{ maxLength: 600 }

// Long summaries - 1000+ words
{ maxLength: 1200 }
```

### Step 3: Customize Output Templates

```typescript
const customSummarizerConfig = {
  name: "Executive Summary Format",
  type: "summarizer",
  config: {
    // ... other settings ...
    outputTemplate: `
# Executive Summary

## Key Findings
{{#each insights}}
- {{this.summary}} (Confidence: {{this.confidence}}%)
{{/each}}

## Recommendations
{{#if recommendations}}
{{#each recommendations}}
- {{this}}
{{/each}}
{{else}}
No specific recommendations at this time.
{{/if}}

## Risk Assessment
{{#if anomalies}}
⚠️ {{anomalies.length}} anomalies detected
{{else}}
✅ No significant anomalies detected
{{/if}}
    `
  }
};
```

## Managing Configurations via GraphQL

### Creating Configurations

```graphql
mutation CreateAnalyzerConfig {
  createAgentConfig(input: {
    name: "Compliance Analyzer"
    type: ANALYZER
    config: {
      llmConfig: {
        temperature: 0.1
        maxTokens: 1000
        model: "gpt-3.5-turbo"
      }
      analysisStrategies: ["rule-based", "llm-based"]
      enableStatisticalAnalysis: true
      anomalyThreshold: 2.0
      minConfidence: 0.8
    }
    metadata: {
      description: "High-confidence analysis for compliance reporting"
      tags: ["compliance", "high-confidence"]
    }
    isDefault: false
  }) {
    id
    name
    version
    isActive
  }
}
```

### Listing Configurations

```graphql
query ListAnalyzerConfigs {
  agentConfigs(filters: {
    type: ANALYZER
    isActive: true
    limit: 10
  }) {
    configs {
      id
      name
      version
      type
      isDefault
      metadata {
        description
        tags
        performanceMetrics {
          avgConfidence
          successRate
        }
      }
      createdAt
    }
    total
    hasMore
  }
}
```

### Setting Default Configurations

```graphql
mutation SetDefaultAnalyzer {
  updateAgentConfig(
    id: "analyzer-config-123"
    input: { isDefault: true }
  ) {
    id
    name
    isDefault
  }
}
```

### Using Configurations in Queries

```graphql
mutation ExecuteQueryWithConfig {
  executeQuery(
    query: "Analyze contamination trends for Berlin facilities"
    analyzerConfigId: "compliance-analyzer-123"
    summarizerConfigId: "executive-summary-456"
  ) {
    message
    analysis {
      insights {
        summary
        confidence
      }
      anomalies {
        type
        severity
      }
    }
    metadata {
      tools_used
      execution_time_ms
      analyzer_config_used
      summarizer_config_used
    }
  }
}
```

## Performance Tuning

### Speed vs Accuracy Tradeoffs

#### Maximum Speed Configuration
```typescript
const speedConfig = {
  analyzer: {
    analysisStrategies: ["rule-based"],
    enableStatisticalAnalysis: false,
    minConfidence: 0.6
  },
  summarizer: {
    summarizationStrategies: ["template-based"],
    format: "plain",
    maxLength: 200
  }
};
// Expected: <2s response time, 70% accuracy
```

#### Maximum Accuracy Configuration
```typescript
const accuracyConfig = {
  analyzer: {
    analysisStrategies: ["llm-based"],
    enableChainOfThought: true,
    enableSelfCritique: true,
    minConfidence: 0.9
  },
  summarizer: {
    summarizationStrategies: ["llm-based"],
    model: "gpt-4",
    maxLength: 1000
  }
};
// Expected: 8-12s response time, 95% accuracy
```

#### Balanced Configuration
```typescript
const balancedConfig = {
  analyzer: {
    analysisStrategies: ["rule-based", "llm-based"],
    enableStatisticalAnalysis: true,
    minConfidence: 0.8
  },
  summarizer: {
    summarizationStrategies: ["template-based"],
    format: "markdown",
    maxLength: 500
  }
};
// Expected: 3-5s response time, 85% accuracy
```

### Monitoring Performance

```graphql
query GetConfigPerformance {
  agentConfigs(filters: { type: ANALYZER }) {
    configs {
      id
      name
      metadata {
        performanceMetrics {
          avgConfidence
          avgQualityScore
          totalUsage
          successRate
          lastUsed
        }
      }
    }
  }
}
```

## Best Practices

### Configuration Naming

```typescript
// Good: Descriptive and specific
"Compliance-High-Confidence-Analyzer-v1"
"Customer-Service-Casual-Summarizer"
"Executive-Report-Template-v2"

// Avoid: Generic names
"Analyzer Config"
"Summarizer"
"Config 1"
```

### Version Management

```typescript
// Version your configurations
const config = {
  name: "Compliance Analyzer",
  version: 2,
  metadata: {
    description: "Updated with new compliance rules",
    changelog: "Added GDPR compliance checks"
  }
};
```

### Testing Configurations

```typescript
// Test with sample data
const testQuery = "Analyze contamination data for testing";
const result = await executeQuery(testQuery, {
  analyzerConfigId: "test-config-123"
});

// Validate results
assert(result.confidence >= 0.8);
assert(result.insights.length > 0);
```

### A/B Testing

```typescript
// Run parallel tests
const configA = "fast-analyzer-v1";
const configB = "accurate-analyzer-v1";

const resultsA = await executeQuery(query, { analyzerConfigId: configA });
const resultsB = await executeQuery(query, { analyzerConfigId: configB });

// Compare performance metrics
compareResults(resultsA, resultsB);
```

## Common Use Cases

### Compliance Reporting
```typescript
const complianceConfig = {
  analyzer: {
    analysisStrategies: ["rule-based", "llm-based"],
    enableStatisticalAnalysis: true,
    minConfidence: 0.9,
    anomalyThreshold: 1.5
  },
  summarizer: {
    format: "markdown",
    tone: "professional",
    includeRecommendations: true
  }
};
```

### Customer Support
```typescript
const supportConfig = {
  analyzer: {
    analysisStrategies: ["rule-based"],
    minConfidence: 0.7
  },
  summarizer: {
    format: "plain",
    tone: "casual",
    maxLength: 300
  }
};
```

### Executive Dashboards
```typescript
const executiveConfig = {
  analyzer: {
    analysisStrategies: ["llm-based"],
    enableStatisticalAnalysis: true,
    minConfidence: 0.8
  },
  summarizer: {
    format: "markdown",
    tone: "professional",
    includeRecommendations: true,
    maxLength: 600
  }
};
```

### Real-Time Monitoring
```typescript
const monitoringConfig = {
  analyzer: {
    analysisStrategies: ["rule-based"],
    enableStatisticalAnalysis: true,
    minConfidence: 0.6
  },
  summarizer: {
    format: "plain",
    tone: "technical",
    maxLength: 200
  }
};
```

## What's Next?

Now that you can configure agents:

- 🤖 [**Agent System**](../agents/overview.md) - Learn about the 4 main agents
- 🛠️ [**Tool System**](../foundation/tool-system.md) - Explore the tools agents use
- 🚀 [**Intelligence Upgrades**](./intelligence-upgrades.md) - Learn about performance improvements
- 🧪 [**Testing**](./testing.md) - Test your configurations

---

**Questions?** Check the [guides](./environment-setup.md) or specific agent documentation.
