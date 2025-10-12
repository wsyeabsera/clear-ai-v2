/**
 * Benchmark Runner
 * Runs scenarios multiple times to establish performance baselines
 */

import { GraphQLClient } from '../client/graphql-client.js';
import type { Scenario } from '../types/scenario.js';

export interface BenchmarkConfig {
  runs: number;
  warmup?: number;
}

export interface BenchmarkResult {
  scenario: Scenario;
  runs: number;
  latencies: number[];
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  stdDev: number;
  successRate: number;
}

export class BenchmarkRunner {
  constructor(private client: GraphQLClient) {}

  /**
   * Benchmark a scenario
   */
  async benchmark(
    scenario: Scenario,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const { runs, warmup = 0 } = config;

    console.log(`\n📊 Benchmarking: ${scenario.name}`);
    console.log(`   Runs: ${runs} (+ ${warmup} warmup)\n`);

    const latencies: number[] = [];
    let successCount = 0;

    // Warmup runs
    if (warmup > 0) {
      console.log(`Warming up...`);
      for (let i = 0; i < warmup; i++) {
        try {
          await this.client.executeQuery({
            query: scenario.query,
            userId: `warmup-${i}`,
          });
        } catch (error) {
          // Ignore warmup errors
        }
      }
      console.log(`✓ Warmup complete\n`);
    }

    // Benchmark runs
    console.log(`Running benchmark...`);
    for (let i = 0; i < runs; i++) {
      const startTime = Date.now();

      try {
        await this.client.executeQuery({
          query: scenario.query,
          userId: `benchmark-${i}`,
        });

        const latency = Date.now() - startTime;
        latencies.push(latency);
        successCount++;

        process.stdout.write(`\rRun ${i + 1}/${runs}: ${latency}ms`);
      } catch (error: any) {
        process.stdout.write(`\rRun ${i + 1}/${runs}: FAILED`);
      }
    }

    process.stdout.write('\n');

    // Calculate statistics
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const avg = average(latencies);
    const stdDev = standardDeviation(latencies, avg);

    const result: BenchmarkResult = {
      scenario,
      runs,
      latencies,
      avgLatency: avg,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: percentile(sortedLatencies, 50),
      p95Latency: percentile(sortedLatencies, 95),
      p99Latency: percentile(sortedLatencies, 99),
      stdDev,
      successRate: (successCount / runs) * 100,
    };

    this.printBenchmarkResults(result);
    return result;
  }

  /**
   * Print benchmark results
   */
  private printBenchmarkResults(result: BenchmarkResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`Benchmark Results: ${result.scenario.name}`);
    console.log('='.repeat(60));
    console.log(`\nRuns: ${result.runs}`);
    console.log(`Success Rate: ${result.successRate.toFixed(1)}%`);
    
    console.log(`\nLatency Statistics:`);
    console.log(`  Average: ${result.avgLatency.toFixed(0)}ms`);
    console.log(`  Min: ${result.minLatency}ms`);
    console.log(`  Max: ${result.maxLatency}ms`);
    console.log(`  StdDev: ${result.stdDev.toFixed(0)}ms`);
    
    console.log(`\nPercentiles:`);
    console.log(`  P50: ${result.p50Latency}ms`);
    console.log(`  P95: ${result.p95Latency}ms`);
    console.log(`  P99: ${result.p99Latency}ms`);
    
    console.log('='.repeat(60) + '\n');
  }
}

function average(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

function standardDeviation(arr: number[], mean: number): number {
  if (arr.length === 0) return 0;
  const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

