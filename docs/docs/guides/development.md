---
sidebar_position: 4
---

# Development Guide

Guide for developers working on Clear AI v2: project structure, adding modules, code style, and contribution process.

## Project Structure

```
clear-ai-v2/
├── src/
│   ├── shared/           # ⭐ Shared library (19 modules)
│   │   ├── conversational/
│   │   ├── context/
│   │   ├── workflow/
│   │   ├── tokens/
│   │   ├── memory/
│   │   ├── llm/
│   │   ├── observability/
│   │   ├── response/
│   │   ├── intent/
│   │   ├── confidence/
│   │   ├── progress/
│   │   ├── conversation/
│   │   ├── types/
│   │   ├── validation/
│   │   ├── utils/
│   │   └── config/
│   ├── tools/            # MCP tools
│   ├── api/              # REST API
│   ├── mcp/              # MCP server
│   └── tests/            # All tests
├── docs/                 # Documentation (Docusaurus)
├── dist/                 # Compiled output
└── package.json
```

## Adding a New Module

### 1. Create Module (TDD)

```bash
# Create test first
touch src/tests/shared/my-module/feature.test.ts

# Write failing tests
# Implement feature
# Refactor
```

### 2. Add to Shared Index

```typescript
// src/shared/index.ts
export * from './my-module/index.js';
```

### 3. Document

```bash
# Create documentation
touch docs/docs/category/my-module.md

# Follow existing format
# Update sidebars.ts
```

## Code Style

- **TypeScript**: Strict mode, ES modules
- **Testing**: TDD approach, Jest
- **Naming**: camelCase for variables, PascalCase for classes
- **Files**: kebab-case.ts
- **Exports**: Named exports preferred

## Building

```bash
yarn build  # Compile TypeScript
yarn lint   # Type checking
```

## Documentation

```bash
yarn docs:start  # Dev server
yarn docs:build  # Production build
```

## Pull Request Process

1. Create feature branch
2. Write tests (TDD)
3. Implement feature
4. All tests pass
5. Update documentation
6. Submit PR

---

**All documentation complete!**
