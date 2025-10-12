import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GraphQLClient } from '../client/graphql-client.js';
import { ScenarioLoader } from '../scenarios/loader.js';
import { TestRunner } from '../runner/test-runner.js';
import { ValidationEngine } from '../validation/engine.js';
import type { Scenario } from '../types/scenario.js';

export interface JestTestOptions {
  scenariosDir: string;
  endpoint?: string;
  category?: string;
  tags?: string[];
  priority?: string;
  timeout?: number;
}

/**
 * Create Jest tests from agent test scenarios
 * This allows running agent scenarios as part of the Jest test suite
 */
export function createJestTests(options: JestTestOptions) {
  const {
    scenariosDir,
    endpoint = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4001/graphql',
    category,
    tags,
    priority,
    timeout = 60000,
  } = options;

  // Load scenarios synchronously at module level (Jest requirement)
  const loader = new ScenarioLoader(scenariosDir);
  const loadOptions: any = {};
  if (category) loadOptions.category = category;
  if (tags) loadOptions.tags = tags;
  if (priority) loadOptions.priority = priority;

  // Load scenarios synchronously using loader.loadSync() or fail fast
  let scenarios: Scenario[] = [];
  try {
    // We need to load synchronously, so we'll use a workaround
    // Note: This will be executed when Jest parses the file
    const fs = require('fs');
    const yaml = require('yaml');
    const glob = require('glob');
    
    const pattern = category ? `${scenariosDir}/${category}/**/*.yml` : `${scenariosDir}/**/*.yml`;
    const files = glob.sync(pattern);
    
    scenarios = files.map((file: string) => {
      const content = fs.readFileSync(file, 'utf-8');
      return yaml.parse(content);
    });

    if (priority) {
      scenarios = scenarios.filter((s: Scenario) => s.priority === priority);
    }
    if (tags && tags.length > 0) {
      scenarios = scenarios.filter((s: Scenario) => 
        s.tags && s.tags.some((t: string) => tags.includes(t))
      );
    }
  } catch (error: any) {
    console.error('Failed to load scenarios:', error.message);
  }

  let client: GraphQLClient;
  let runner: TestRunner;

  beforeAll(async () => {
    // Initialize GraphQL client
    client = new GraphQLClient({
      httpEndpoint: endpoint,
      timeout: 30000,
      maxRetries: 3,
    });

    // Check if server is available
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
      throw new Error(`GraphQL server at ${endpoint} is not responding`);
    }

    // Initialize test runner (creates its own validators internally)
    runner = new TestRunner({
      client,
      timeout: 30000,
      retries: 3,
      verbose: false,
    });

    if (scenarios.length === 0) {
      throw new Error('No scenarios loaded for testing');
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Agent System Tests (via scenarios)', () => {
    // Create a test for each scenario
    scenarios?.forEach((scenario) => {
      it(
        `${scenario.category}/${scenario.id}: ${scenario.name}`,
        async () => {
          const result = await runner.runScenario(scenario);

          // Log failures for debugging
          if (!result.success) {
            console.error(`\nTest failed: ${scenario.id}`);
            console.error('Validation errors:', result.validationResult.errors);
            console.error('Validation details:', result.validationResult.details);
            if (result.error) {
              console.error('Execution error:', result.error);
            }
          }

          // Jest assertions
          expect(result.success).toBe(true);
          expect(result.validationResult.passed).toBe(true);
          expect(result.validationResult.errors).toHaveLength(0);

          // Check that tools were used
          if (scenario.expectedBehavior.toolsUsed && scenario.expectedBehavior.toolsUsed.length > 0) {
            expect(result.executionResult?.toolsUsed).toBeDefined();
            expect(result.executionResult?.toolsUsed.length).toBeGreaterThan(0);
          }

          // Check latency requirements
          if (scenario.expectedBehavior.maxLatencyMs) {
            expect(result.metrics.totalLatencyMs).toBeLessThanOrEqual(
              scenario.expectedBehavior.maxLatencyMs
            );
          }

          // Check validation confidence
          expect(result.validationResult.confidence).toBeGreaterThan(0.5);
        },
        timeout
      );
    });

    // Add summary test
    it('should have scenarios loaded', () => {
      expect(scenarios).toBeDefined();
      expect(scenarios.length).toBeGreaterThan(0);
    });
  });
}

/**
 * Helper to run a single category of tests
 */
export function createJestTestsForCategory(
  scenariosDir: string,
  category: string,
  timeout: number = 60000
) {
  return createJestTests({
    scenariosDir,
    category,
    timeout,
  });
}

/**
 * Helper to run tests with specific tags
 */
export function createJestTestsForTags(
  scenariosDir: string,
  tags: string[],
  timeout: number = 60000
) {
  return createJestTests({
    scenariosDir,
    tags,
    timeout,
  });
}

