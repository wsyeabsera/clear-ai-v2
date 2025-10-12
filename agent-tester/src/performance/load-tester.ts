/**
 * Load Tester
 * Tests system under concurrent load
 */

import pLimit from 'p-limit';
import { GraphQLClient } from '../client/graphql-client.js';
import type { Scenario } from '../types/scenario.js';

export interface LoadTestConfig {
  concurrency: number;
  duration?: number;
  requests?: number;
  rampUp?: boolean;
  rampUpStep?: number;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  totalDuration: number;
  errors: Array<{ message: string; count: number }>;
}

export class LoadTester {
  constructor(private client: GraphQLClient) {}

  /**
   * Run load test
   */
  async runLoadTest(
    scenario: Scenario,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    console.log(`\n🔄 Starting load test:`);
    console.log(`   Concurrency: ${config.concurrency}`);
    console.log(`   Requests: ${config.requests || 'unlimited'}`);
    console.log(`   Duration: ${config.duration ? config.duration + 'ms' : 'unlimited'}\n`);

    const startTime = Date.now();
    const latencies: number[] = [];
    const errors: Map<string, number> = new Map();
    let successCount = 0;
    let failCount = 0;

    // Create rate limiter
    const limit = pLimit(config.concurrency);

    // Determine number of requests
    const requestCount = config.requests || config.concurrency * 10;
    const requests: Promise<void>[] = [];

    for (let i = 0; i < requestCount; i++) {
      const requestPromise = limit(async () => {
        const reqStart = Date.now();

        try {
          await this.client.executeQuery({
            query: scenario.query,
            userId: `load-test-${i}`,
          });

          const latency = Date.now() - reqStart;
          latencies.push(latency);
          successCount++;

          // Progress indicator
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\rCompleted: ${i + 1}/${requestCount}`);
          }
        } catch (error: any) {
          failCount++;
          const errorMsg = error.message.substring(0, 100);
          errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
        }
      });

      requests.push(requestPromise);
    }

    // Wait for all requests
    await Promise.all(requests);
    process.stdout.write('\n');

    const totalDuration = Date.now() - startTime;

    // Calculate statistics
    const sortedLatencies = latencies.sort((a, b) => a - b);

    const result: LoadTestResult = {
      totalRequests: requestCount,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgLatency: average(latencies),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: percentile(sortedLatencies, 50),
      p95Latency: percentile(sortedLatencies, 95),
      p99Latency: percentile(sortedLatencies, 99),
      requestsPerSecond: (requestCount / totalDuration) * 1000,
      totalDuration,
      errors: Array.from(errors.entries()).map(([message, count]) => ({
        message,
        count,
      })),
    };

    this.printLoadTestResults(result);
    return result;
  }

  /**
   * Print load test results
   */
  private printLoadTestResults(result: LoadTestResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('Load Test Results');
    console.log('='.repeat(60));
    console.log(`\nRequests:`);
    console.log(`  Total: ${result.totalRequests}`);
    console.log(`  Successful: ${result.successfulRequests}`);
    console.log(`  Failed: ${result.failedRequests}`);
    console.log(`  Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`);
    
    console.log(`\nLatency:`);
    console.log(`  Average: ${result.avgLatency.toFixed(0)}ms`);
    console.log(`  Min: ${result.minLatency}ms`);
    console.log(`  Max: ${result.maxLatency}ms`);
    console.log(`  P50: ${result.p50Latency}ms`);
    console.log(`  P95: ${result.p95Latency}ms`);
    console.log(`  P99: ${result.p99Latency}ms`);
    
    console.log(`\nThroughput:`);
    console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`  Total Duration: ${(result.totalDuration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log(`\nErrors:`);
      for (const error of result.errors) {
        console.log(`  ${error.message}: ${error.count} occurrences`);
      }
    }

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

