# Agent Tester - Usage Examples

## Overview

Practical examples demonstrating how to use the Agent Tester for various testing scenarios.

## Basic Usage

### Running a Single Scenario

```bash
# Run a specific scenario by ID
yarn test:run --scenario simple-001

# Output:
Running scenario: simple-001 (List recent shipments)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Test passed in 1.2s
  Tools: [shipments]
  Cost: $0.01
  Confidence: 95%
```

### Running a Test Suite

```bash
# Run all simple scenarios
yarn test:run --category simple

# Run all scenarios in a directory
yarn test:run --path scenarios/simple/

# Run all scenarios
yarn test:run --all
```

### Running with Filters

```bash
# Run scenarios with specific tags
yarn test:run --tags shipments,time-filter

# Run by priority
yarn test:run --priority critical

# Run failed scenarios from last run
yarn test:run --failed-only

# Run specific scenarios
yarn test:run --scenarios simple-001,complex-003,edge-007
```

## Advanced Usage

### Parallel Execution

```bash
# Run with 10 parallel workers
yarn test:run --all --parallel 10

# Run sequentially (no parallelism)
yarn test:run --all --parallel 1
```

### Custom Configuration

```bash
# Use custom config file
yarn test:run --config custom-config.yml

# Override timeout
yarn test:run --all --timeout 60000

# Override endpoint
yarn test:run --all --endpoint http://staging.example.com/graphql
```

### Watch Mode

```bash
# Watch for scenario file changes
yarn test:watch

# Auto-run on changes
yarn test:watch --auto-run
```

## Scenario Development

### Creating a New Scenario

```bash
# Generate scenario template
yarn scenario:new --name "My Test" --category simple

# Opens editor with template:
# scenarios/simple/my-test.yml
```

```yaml
id: simple-015
name: "My Test"
category: simple
description: "Add description here"

query: "Your test query here"

expectedBehavior:
  toolsUsed: []
  maxLatencyMs: 5000

validation:
  - type: tool_selection
    expected: []
```

### Testing Your Scenario

```bash
# Test the new scenario
yarn test:run --scenario simple-015

# Debug mode (verbose output)
yarn test:run --scenario simple-015 --debug

# See validation details
yarn test:run --scenario simple-015 --verbose
```

### Validating Scenario Syntax

```bash
# Validate YAML syntax
yarn scenario:validate scenarios/simple/my-test.yml

# Validate all scenarios
yarn scenario:validate --all
```

## Generating Scenarios

### Template-Based Generation

```bash
# Generate from templates
yarn generate:scenarios --strategy template --count 20

# Output: scenarios/generated/template-*.yml
```

### LLM-Based Generation

```bash
# Generate realistic queries
yarn generate:scenarios --strategy llm --count 50

# Focus on specific area
yarn generate:scenarios --strategy llm --count 20 --focus contamination

# Use specific model
yarn generate:scenarios --strategy llm --model gpt-4 --count 10
```

### Combinatorial Generation

```bash
# Generate all tool/filter combinations
yarn generate:scenarios --strategy combinatorial

# Limit combinations
yarn generate:scenarios --strategy combinatorial --max 100
```

## Interpreting Results

### Understanding Test Output

```
✓ simple-001: List recent shipments    1.2s  $0.01  95%
```
- ✓ = Passed
- 1.2s = Total execution time
- $0.01 = Cost in USD
- 95% = Validation confidence

```
✗ complex-001: Contamination analysis  5.2s  $0.05  45%
  └─ Tool selection incorrect
     Expected: [shipments, contaminants]
     Actual:   [shipments]
```
- ✗ = Failed
- Shows specific failure reason
- Shows expected vs actual

### Debugging Failures

```bash
# Run with full details
yarn test:run --scenario complex-001 --verbose

# Output includes:
# - Full GraphQL query
# - Complete response
# - All validation details
# - Stack traces
# - Timing breakdown
```

### Viewing Metrics

```bash
# Show metrics for last run
yarn metrics:show

# Show historical metrics
yarn metrics:show --days 30

# Export metrics to CSV
yarn metrics:export --format csv --output metrics.csv
```

## Performance Testing

### Load Testing

```bash
# Test with 100 concurrent requests
yarn test:load --concurrent 100 --scenario simple-001

# Ramp up gradually
yarn test:load --ramp-up 10 --max 100 --duration 60s

# Stress test to failure
yarn test:stress --start 10 --increment 10 --max 500
```

### Benchmarking

```bash
# Benchmark a scenario
yarn test:benchmark --scenario complex-001 --runs 10

# Output:
Benchmark Results: complex-001 (10 runs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Avg:  2.15s  ($0.04)
  Min:  1.89s  ($0.03)
  Max:  2.58s  ($0.05)
  P50:  2.12s  ($0.04)
  P95:  2.45s  ($0.05)
  StdDev: 0.18s
```

## Regression Testing

### Establishing Baseline

```bash
# Run tests and save as baseline
yarn test:run --all --save-baseline

# Baseline saved to: baselines/baseline-2025-10-12.json
```

### Comparing to Baseline

```bash
# Compare current to baseline
yarn test:run --all --compare-baseline

# Output shows regressions and improvements
```

### Continuous Regression Checking

```bash
# In CI/CD
yarn test:regression --fail-on-regression

# Exit code 2 if regressions detected
# Exit code 0 if no regressions
```

## Integration with Development Workflow

### Pre-Commit Testing

```bash
# .husky/pre-commit
#!/bin/sh
cd agent-tester
yarn test:run --priority critical --quick
```

### Pre-Push Testing

```bash
# .husky/pre-push
#!/bin/sh
cd agent-tester
yarn test:run --all --quick
```

### PR Validation

```yaml
# In CI/CD
- name: Run Agent Tests
  run: |
    cd agent-tester
    yarn test:run --all --compare-baseline --output github
```

## Troubleshooting

### Common Issues

**Issue: Tests timing out**
```bash
# Increase timeout
yarn test:run --all --timeout 60000

# Check GraphQL server is running
curl http://localhost:4001/health
```

**Issue: Database errors**
```bash
# Reset test database
yarn db:reset

# Re-seed data
yarn db:seed
```

**Issue: Validation failures**
```bash
# Run with debug output
yarn test:run --scenario failing-test --debug

# Check validation rules
cat scenarios/path/to/scenario.yml
```

**Issue: Cost too high**
```bash
# Analyze token usage
yarn metrics:show --metric tokens --top 10

# Review expensive scenarios
yarn metrics:show --sort cost --limit 5
```

## Advanced Workflows

### A/B Testing Models

```bash
# Run with GPT-3.5
OPENAI_MODEL=gpt-3.5-turbo yarn test:run --all --label gpt-3.5

# Run with GPT-4
OPENAI_MODEL=gpt-4-turbo-preview yarn test:run --all --label gpt-4

# Compare results
yarn compare:runs --run1 gpt-3.5 --run2 gpt-4
```

### Scenario Development Workflow

```bash
# 1. Create scenario
yarn scenario:new --name "My test" --category simple

# 2. Edit scenario
vim scenarios/simple/my-test.yml

# 3. Test it
yarn test:run --scenario simple-new --debug

# 4. Fix validation
vim scenarios/simple/my-test.yml

# 5. Retest
yarn test:run --scenario simple-new

# 6. Add to suite
git add scenarios/simple/my-test.yml
git commit -m "Add my-test scenario"
```

### Performance Investigation

```bash
# 1. Run performance tests
yarn test:run --category performance

# 2. Identify slow scenarios
yarn metrics:show --sort latency --top 10

# 3. Profile specific scenario
yarn test:profile --scenario perf-slow-001

# 4. Review breakdown
# Shows: planner time, executor time, analyzer time, etc.

# 5. Optimize and retest
yarn test:benchmark --scenario perf-slow-001 --runs 10
```

---

**Next Document:** [11-training-integration.md](./11-training-integration.md) - Training module integration

