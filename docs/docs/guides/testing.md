---
sidebar_position: 2
---

# Testing Guide

Comprehensive guide to running and writing tests for Clear AI v2.

## Test Suite Overview

- **724 Unit Tests**: Fast, isolated, run locally
- **45 Integration Tests**: Real services, run before deploy
- **100% Pass Rate**: All tests maintained passing

## Running Tests

### All Unit Tests
```bash
yarn test
# 724 tests in ~2 seconds
```

### All Tests (Unit + Integration)
```bash
yarn test:all
# 769 tests in ~5 seconds (requires services)
```

### Integration Tests Only
```bash
yarn test:integration
# 45 tests, requires OpenAI/Groq/Neo4j/Pinecone
```

### With Coverage
```bash
yarn test:coverage
# Generates coverage/ directory
# View: open coverage/lcov-report/index.html
```

### Watch Mode
```bash
yarn test:watch
# Re-runs on file changes
```

### Specific Tests
```bash
yarn test ResponseBuilder
yarn test --testPathPattern=context
yarn test manager.test.ts
```

## Test Categories

### Unit Tests (724)
- Conversational AI: 92 tests
- Context Management: 112 tests
- Workflows: 35 tests
- Token Management: 34 tests
- Utilities: 216 tests
- Other: 235 tests

### Integration Tests (45)
- LLM Providers: 16 tests
- Memory Systems: 15 tests
- Context Compression: 3 tests
- Workflow Execution: 4 tests
- API Endpoints: 4 tests
- Conversation Scenarios: 3 tests

## Writing Tests

Clear AI v2 uses TDD (Test-Driven Development):

### 1. Red - Write Failing Test
```typescript
describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFeature.doSomething();
    expect(result).toBe('expected');
  });
});
```

### 2. Green - Implement Feature
```typescript
class MyFeature {
  doSomething() {
    return 'expected';
  }
}
```

### 3. Refactor - Improve Code
```typescript
// Optimize, clean up, maintain tests passing
```

## Best Practices

✅ Write tests first (TDD)  
✅ One assertion per test  
✅ Descriptive test names  
✅ Clean up after tests  
✅ Mock external services  

---

**Next:** [Configuration Guide](./configuration.md)
