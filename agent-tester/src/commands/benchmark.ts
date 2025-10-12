/**
 * Benchmark Command
 * CLI command for benchmarking scenarios
 */

import * as fs from 'fs';
import * as path from 'path';
import { GraphQLClient } from '../client/graphql-client.js';
import { ScenarioLoader } from '../scenarios/loader.js';
import { BenchmarkRunner } from '../performance/benchmark-runner.js';

export interface BenchmarkOptions {
  scenario: string;
  runs?: number;
  warmup?: number;
  endpoint?: string;
}

export async function benchmarkCommand(options: BenchmarkOptions): Promise<void> {
  console.log('\n📊 Starting benchmark...\n');

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

    // Run benchmark
    const runner = new BenchmarkRunner(client);
    const result = await runner.benchmark(scenario, {
      runs: options.runs || 10,
      warmup: options.warmup || 2,
    });

    // Export results
    const outputPath = path.join('results', `benchmark-${options.scenario}-${Date.now()}.json`);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✓ Results saved to ${outputPath}\n`);

  } catch (error: any) {
    console.error(`\n❌ Benchmark failed: ${error.message}\n`);
    process.exit(1);
  }
}

