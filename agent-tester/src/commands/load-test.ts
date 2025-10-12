/**
 * Load Test Command
 * CLI command for running load tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { GraphQLClient } from '../client/graphql-client.js';
import { ScenarioLoader } from '../scenarios/loader.js';
import { LoadTester } from '../performance/load-tester.js';

export interface LoadTestOptions {
  scenario: string;
  concurrency?: number;
  requests?: number;
  endpoint?: string;
}

export async function loadTestCommand(options: LoadTestOptions): Promise<void> {
  console.log('\n⚡ Starting load test...\n');

  try {
    // Initialize client
    const client = new GraphQLClient({
      httpEndpoint: options.endpoint || process.env.GRAPHQL_HTTP_ENDPOINT || 'http://localhost:4001/graphql',
      timeout: 60000,
    });

    // Health check
    const healthy = await client.healthCheck();
    if (!healthy) {
      console.error('❌ GraphQL server is not responding');
      process.exit(1);
    }
    console.log('✓ GraphQL server is healthy\n');

    // Load scenario
    const loader = new ScenarioLoader('scenarios');
    const scenario = await loader.loadById(options.scenario);

    if (!scenario) {
      console.error(`❌ Scenario not found: ${options.scenario}`);
      process.exit(1);
    }

    // Run load test
    const tester = new LoadTester(client);
    const result = await tester.runLoadTest(scenario, {
      concurrency: options.concurrency || 10,
      requests: options.requests || 100,
    });

    // Export results
    const outputPath = path.join('results', `load-test-${options.scenario}-${Date.now()}.json`);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✓ Results saved to ${outputPath}\n`);

  } catch (error: any) {
    console.error(`\n❌ Load test failed: ${error.message}\n`);
    process.exit(1);
  }
}

