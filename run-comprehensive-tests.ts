#!/usr/bin/env ts-node

/**
 * Comprehensive Test Runner
 * Executes 100+ test scenarios with parallel processing, progress tracking, and detailed reporting
 * 
 * Features:
 * - Parallel test execution (configurable concurrency)
 * - Progress tracking and reporting
 * - Failure categorization
 * - Performance metrics
 * - Retry logic for flaky tests
 * - Detailed logging
 * - HTML/JSON report generation
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  graphqlUrl: 'http://localhost:4001/graphql',
  maxConcurrency: 5,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
};

// Types
interface TestScenario {
  id: string;
  category: string;
  subcategory: string;
  query: string;
  expectedTools: string[];
  expectedParams?: Record<string, any>;
  avoidedTools?: string[];
  minSteps: number;
  maxSteps: number;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedIntent?: string;
}

interface TestResult {
  scenarioId: string;
  category: string;
  subcategory: string;
  query: string;
  success: boolean;
  executionTime: number;
  planTime: number;
  executionTime_ms: number;
  analysisTime: number;
  error?: string;
  plan?: any;
  execution?: any;
  analysis?: any;
  toolSelectionCorrect?: boolean;
  parameterAccuracy?: boolean;
  intentRecognitionCorrect?: boolean;
  stepCountCorrect?: boolean;
  performanceMetrics?: {
    planGenerationTime: number;
    toolExecutionTime: number;
    analysisTime: number;
    totalTime: number;
  };
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  successRate: number;
  averageExecutionTime: number;
  categoryBreakdown: Record<string, {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  }>;
  difficultyBreakdown: Record<string, {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  }>;
  performanceMetrics: {
    averagePlanTime: number;
    averageExecutionTime: number;
    averageAnalysisTime: number;
    p95PlanTime: number;
    p95ExecutionTime: number;
    p95AnalysisTime: number;
  };
  failures: {
    category: string;
    subcategory: string;
    error: string;
    count: number;
  }[];
}

// GraphQL mutations
const PLAN_QUERY = `
  mutation PlanQuery($query: String!) {
    planQuery(query: $query) {
      requestId
      plan {
        steps {
          tool
          params
          dependsOn
          parallel
        }
      }
    }
  }
`;

const EXECUTE_TOOLS = `
  mutation ExecuteTools($requestId: ID!) {
    executeTools(requestId: $requestId) {
      requestId
      results {
        success
        tool
        data
        error {
          code
          message
          details
        }
        metadata {
          executionTime
          timestamp
          retries
        }
      }
      metadata {
        totalDurationMs
        successfulSteps
        failedSteps
        timestamp
      }
    }
  }
`;

const ANALYZE_RESULTS = `
  mutation AnalyzeResults($requestId: ID!) {
    analyzeResults(requestId: $requestId) {
      requestId
      analysis {
        summary
        insights {
          type
          description
          confidence
          supportingData
        }
        entities {
          id
          type
          name
          attributes
        }
        anomalies {
          type
          description
          severity
          affectedEntities
          data
        }
        metadata {
          toolResultsCount
          successfulResults
          failedResults
          analysisTimeMs
        }
      }
    }
  }
`;

// Test execution functions
async function executeGraphQLQuery(query: string, variables: any): Promise<any> {
  const response = await axios.post(CONFIG.graphqlUrl, {
    query,
    variables
  }, {
    timeout: CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (response.data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data.data;
}

async function executeScenario(scenario: TestScenario, retryCount = 0): Promise<TestResult> {
  const startTime = performance.now();
  const result: TestResult = {
    scenarioId: scenario.id,
    category: scenario.category,
    subcategory: scenario.subcategory,
    query: scenario.query,
    success: false,
    executionTime: 0,
    planTime: 0,
    executionTime_ms: 0,
    analysisTime: 0
  };

  try {
    console.log(`  🧪 Running ${scenario.id}: ${scenario.query.substring(0, 50)}...`);

    // Step 1: Plan Query
    const planStartTime = performance.now();
    const planResult = await executeGraphQLQuery(PLAN_QUERY, {
      query: scenario.query
    });
    result.planTime = performance.now() - planStartTime;
    result.plan = planResult.planQuery;

    // Step 2: Execute Tools
    const executionStartTime = performance.now();
    const executionResult = await executeGraphQLQuery(EXECUTE_TOOLS, {
      requestId: planResult.planQuery.requestId
    });
    result.executionTime_ms = performance.now() - executionStartTime;
    result.execution = executionResult.executeTools;

    // Step 3: Analyze Results
    const analysisStartTime = performance.now();
    const analysisResult = await executeGraphQLQuery(ANALYZE_RESULTS, {
      requestId: planResult.planQuery.requestId
    });
    result.analysisTime = performance.now() - analysisStartTime;
    result.analysis = analysisResult.analyzeResults;

    // Validate results
    result.toolSelectionCorrect = validateToolSelection(scenario, planResult.planQuery.plan);
    result.parameterAccuracy = validateParameters(scenario, planResult.planQuery.plan);
    result.stepCountCorrect = validateStepCount(scenario, planResult.planQuery.plan);
    result.intentRecognitionCorrect = validateIntentRecognition(scenario, planResult.planQuery.plan);

    result.success = true;
    result.executionTime = performance.now() - startTime;

    result.performanceMetrics = {
      planGenerationTime: result.planTime,
      toolExecutionTime: result.executionTime_ms,
      analysisTime: result.analysisTime,
      totalTime: result.executionTime
    };

    console.log(`    ✅ ${scenario.id} completed in ${result.executionTime.toFixed(2)}ms`);

  } catch (error) {
    result.error = error.message;
    result.executionTime = performance.now() - startTime;
    
    console.log(`    ❌ ${scenario.id} failed: ${error.message}`);
    
    // Retry logic
    if (retryCount < CONFIG.maxRetries && isRetryableError(error)) {
      console.log(`    🔄 Retrying ${scenario.id} (attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return executeScenario(scenario, retryCount + 1);
    }
  }

  return result;
}

// Validation functions
function validateToolSelection(scenario: TestScenario, plan: any): boolean {
  if (!plan || !plan.steps) return false;
  
  const usedTools = plan.steps.map((step: any) => step.tool);
  
  // Check expected tools are present
  const expectedPresent = scenario.expectedTools.every(tool => usedTools.includes(tool));
  
  // Check avoided tools are not present
  const avoidedAbsent = !scenario.avoidedTools || scenario.avoidedTools.every(tool => !usedTools.includes(tool));
  
  return expectedPresent && avoidedAbsent;
}

function validateParameters(scenario: TestScenario, plan: any): boolean {
  if (!plan || !plan.steps || !scenario.expectedParams) return true;
  
  return plan.steps.some((step: any) => {
    if (!step.params) return false;
    return Object.entries(scenario.expectedParams).every(([key, value]) => {
      return step.params[key] === value;
    });
  });
}

function validateStepCount(scenario: TestScenario, plan: any): boolean {
  if (!plan || !plan.steps) return false;
  
  const stepCount = plan.steps.length;
  return stepCount >= scenario.minSteps && stepCount <= scenario.maxSteps;
}

function validateIntentRecognition(scenario: TestScenario, plan: any): boolean {
  // This would need to be implemented based on the plan structure
  // For now, return true as a placeholder
  return true;
}

function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET'
  ];
  
  return retryableErrors.some(errorType => error.message.includes(errorType));
}

// Parallel execution with concurrency control
async function executeScenariosInParallel(scenarios: TestScenario[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < scenarios.length; i += CONFIG.maxConcurrency) {
    const batch = scenarios.slice(i, i + CONFIG.maxConcurrency);
    
    const batchPromises = batch.map(async (scenario, index) => {
      const result = await executeScenario(scenario);
      results[i + index] = result;
    });
    
    await Promise.all(batchPromises);
    
    const completed = Math.min(i + CONFIG.maxConcurrency, scenarios.length);
    console.log(`📊 Progress: ${completed}/${scenarios.length} scenarios completed`);
  }
  
  return results;
}

// Analysis and reporting
function analyzeResults(results: TestResult[]): TestSummary {
  const totalTests = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = totalTests - passed;
  const successRate = (passed / totalTests) * 100;

  // Category breakdown
  const categoryBreakdown: Record<string, any> = {};
  results.forEach(result => {
    if (!categoryBreakdown[result.category]) {
      categoryBreakdown[result.category] = { total: 0, passed: 0, failed: 0, successRate: 0 };
    }
    categoryBreakdown[result.category].total++;
    if (result.success) {
      categoryBreakdown[result.category].passed++;
    } else {
      categoryBreakdown[result.category].failed++;
    }
  });

  Object.keys(categoryBreakdown).forEach(category => {
    const cat = categoryBreakdown[category];
    cat.successRate = (cat.passed / cat.total) * 100;
  });

  // Difficulty breakdown (would need difficulty info from scenarios)
  const difficultyBreakdown = {};

  // Performance metrics
  const successfulResults = results.filter(r => r.success && r.performanceMetrics);
  const planTimes = successfulResults.map(r => r.performanceMetrics!.planGenerationTime);
  const executionTimes = successfulResults.map(r => r.performanceMetrics!.toolExecutionTime);
  const analysisTimes = successfulResults.map(r => r.performanceMetrics!.analysisTime);

  const performanceMetrics = {
    averagePlanTime: planTimes.length > 0 ? planTimes.reduce((a, b) => a + b, 0) / planTimes.length : 0,
    averageExecutionTime: executionTimes.length > 0 ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0,
    averageAnalysisTime: analysisTimes.length > 0 ? analysisTimes.reduce((a, b) => a + b, 0) / analysisTimes.length : 0,
    p95PlanTime: calculatePercentile(planTimes, 95),
    p95ExecutionTime: calculatePercentile(executionTimes, 95),
    p95AnalysisTime: calculatePercentile(analysisTimes, 95)
  };

  // Failure analysis
  const failureMap = new Map<string, { category: string; subcategory: string; error: string; count: number }>();
  results.filter(r => !r.success).forEach(result => {
    const key = `${result.category}:${result.subcategory}:${result.error}`;
    if (failureMap.has(key)) {
      failureMap.get(key)!.count++;
    } else {
      failureMap.set(key, {
        category: result.category,
        subcategory: result.subcategory,
        error: result.error || 'Unknown error',
        count: 1
      });
    }
  });

  const failures = Array.from(failureMap.values()).sort((a, b) => b.count - a.count);

  const averageExecutionTime = results.length > 0 
    ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length 
    : 0;

  return {
    totalTests,
    passed,
    failed,
    successRate,
    averageExecutionTime,
    categoryBreakdown,
    difficultyBreakdown,
    performanceMetrics,
    failures
  };
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Report generation
function generateJSONReport(results: TestResult[], summary: TestSummary): void {
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      config: CONFIG,
      summary
    },
    results
  };

  fs.writeFileSync('comprehensive-test-results.json', JSON.stringify(report, null, 2));
  console.log('📄 JSON report saved to comprehensive-test-results.json');
}

function generateHTMLReport(results: TestResult[], summary: TestSummary): void {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Comprehensive Multi-Agent Test Results</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { margin: 30px 0; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background-color: #f8f9fa; font-weight: bold; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .category-header { background: #e9ecef; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Multi-Agent Test Results</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.averageExecutionTime.toFixed(0)}ms</div>
                <div class="metric-label">Avg Execution Time</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="categoryChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <h2>📊 Category Breakdown</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.categoryBreakdown).map(([category, data]) => `
                    <tr>
                        <td class="category-header">${category}</td>
                        <td>${data.total}</td>
                        <td class="success">${data.passed}</td>
                        <td class="failure">${data.failed}</td>
                        <td>${data.successRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>❌ Top Failures</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Error</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${summary.failures.slice(0, 10).map(failure => `
                    <tr>
                        <td>${failure.category}</td>
                        <td>${failure.subcategory}</td>
                        <td>${failure.error}</td>
                        <td>${failure.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>📋 Detailed Results</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Query</th>
                    <th>Status</th>
                    <th>Time (ms)</th>
                    <th>Tools Correct</th>
                    <th>Parameters Correct</th>
                    <th>Steps Correct</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td>${result.scenarioId}</td>
                        <td>${result.category}</td>
                        <td>${result.query.substring(0, 50)}...</td>
                        <td class="${result.success ? 'success' : 'failure'}">${result.success ? '✅' : '❌'}</td>
                        <td>${result.executionTime.toFixed(0)}</td>
                        <td>${result.toolSelectionCorrect ? '✅' : '❌'}</td>
                        <td>${result.parameterAccuracy ? '✅' : '❌'}</td>
                        <td>${result.stepCountCorrect ? '✅' : '❌'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        // Category breakdown chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        const categoryData = ${JSON.stringify(Object.entries(summary.categoryBreakdown).map(([category, data]) => ({
            category,
            successRate: data.successRate
        })))};
        
        new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryData.map(d => d.category),
                datasets: [{
                    label: 'Success Rate (%)',
                    data: categoryData.map(d => d.successRate),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Performance chart
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: ['Plan Generation', 'Tool Execution', 'Analysis'],
                datasets: [{
                    label: 'Average Time (ms)',
                    data: [
                        ${summary.performanceMetrics.averagePlanTime.toFixed(0)},
                        ${summary.performanceMetrics.averageExecutionTime.toFixed(0)},
                        ${summary.performanceMetrics.averageAnalysisTime.toFixed(0)}
                    ],
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  fs.writeFileSync('comprehensive-test-results.html', html);
  console.log('📄 HTML report saved to comprehensive-test-results.html');
}

// Main execution function
async function main() {
  console.log('🚀 Starting comprehensive multi-agent system testing...');
  
  // Load test scenarios
  let scenarios: TestScenario[];
  try {
    const scenariosData = JSON.parse(fs.readFileSync('test-scenarios.json', 'utf8'));
    scenarios = scenariosData.scenarios;
    console.log(`📋 Loaded ${scenarios.length} test scenarios`);
  } catch (error) {
    console.error('❌ Failed to load test scenarios. Run generate-test-scenarios.ts first.');
    process.exit(1);
  }

  // Check GraphQL server connectivity
  try {
    await axios.post(CONFIG.graphqlUrl, {
      query: '{ __schema { types { name } } }'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    console.log('✅ GraphQL server is accessible');
  } catch (error) {
    console.error('❌ GraphQL server is not accessible. Please start the server on port 4001.');
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`⚙️ Configuration: ${CONFIG.maxConcurrency} concurrent tests, ${CONFIG.maxRetries} max retries`);
  console.log('🧪 Starting test execution...\n');

  const startTime = performance.now();
  const results = await executeScenariosInParallel(scenarios);
  const totalTime = performance.now() - startTime;

  console.log('\n📊 Analyzing results...');
  const summary = analyzeResults(results);

  console.log('\n🎯 Test Summary:');
  console.log(`  Total Tests: ${summary.totalTests}`);
  console.log(`  Passed: ${summary.passed} (${summary.successRate.toFixed(1)}%)`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Average Execution Time: ${summary.averageExecutionTime.toFixed(2)}ms`);
  console.log(`  Total Suite Runtime: ${(totalTime / 1000).toFixed(2)}s`);

  console.log('\n📈 Category Breakdown:');
  Object.entries(summary.categoryBreakdown).forEach(([category, data]) => {
    console.log(`  ${category}: ${data.passed}/${data.total} (${data.successRate.toFixed(1)}%)`);
  });

  console.log('\n⚡ Performance Metrics:');
  console.log(`  Average Plan Time: ${summary.performanceMetrics.averagePlanTime.toFixed(2)}ms`);
  console.log(`  Average Execution Time: ${summary.performanceMetrics.averageExecutionTime.toFixed(2)}ms`);
  console.log(`  Average Analysis Time: ${summary.performanceMetrics.averageAnalysisTime.toFixed(2)}ms`);
  console.log(`  95th Percentile Plan Time: ${summary.performanceMetrics.p95PlanTime.toFixed(2)}ms`);
  console.log(`  95th Percentile Execution Time: ${summary.performanceMetrics.p95ExecutionTime.toFixed(2)}ms`);

  if (summary.failures.length > 0) {
    console.log('\n❌ Top Failures:');
    summary.failures.slice(0, 5).forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure.category}:${failure.subcategory} - ${failure.error} (${failure.count} times)`);
    });
  }

  // Generate reports
  console.log('\n📄 Generating reports...');
  generateJSONReport(results, summary);
  generateHTMLReport(results, summary);

  console.log('\n✅ Comprehensive testing completed!');
  
  // Exit with appropriate code
  process.exit(summary.successRate >= 95 ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { executeScenario, analyzeResults, generateJSONReport, generateHTMLReport };
