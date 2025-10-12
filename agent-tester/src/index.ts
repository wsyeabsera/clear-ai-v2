#!/usr/bin/env node

/**
 * Agent Tester CLI
 * Main entry point for the testing framework
 */

import { Command } from 'commander';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { GraphQLClient } from './client/graphql-client.js';
import { ScenarioLoader } from './scenarios/loader.js';
import { TestRunner } from './runner/test-runner.js';
import { ParallelTestRunner } from './runner/parallel-test-runner.js';
import { ValidationEngine } from './validation/engine.js';
import { MetricsTracker } from './metrics/tracker.js';
import { ConsoleReporter } from './reporting/console-reporter.js';
import { HTMLReporter } from './reporting/html-reporter.js';
import { generateCommand } from './commands/generate.js';
import { benchmarkCommand } from './commands/benchmark.js';
import { loadTestCommand } from './commands/load-test.js';
import { BaselineManager } from './regression/baseline-manager.js';
import { RegressionReporter } from './regression/reporter.js';
import type { ScenarioCategory, Priority, TestSuiteResult } from './types/scenario.js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'agent-tester', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const program = new Command();

program
  .name('agent-tester')
  .description('Comprehensive testing framework for Clear AI v2 agent system')
  .version('1.0.0');

program
  .command('run')
  .description('Run test scenarios')
  .option('-s, --scenario <id>', 'Run specific scenario by ID')
  .option('-c, --category <category>', 'Run scenarios in category (simple, complex, edge-case, performance, memory)')
  .option('-t, --tags <tags>', 'Run scenarios with specific tags (comma-separated)')
  .option('-p, --priority <priority>', 'Run scenarios with priority (critical, high, medium, low)')
  .option('-a, --all', 'Run all scenarios')
  .option('--verbose', 'Verbose output')
  .option('--timeout <ms>', 'Timeout per scenario (ms)', '30000')
  .option('--retries <n>', 'Number of retries on failure', '3')
  .option('--export <filepath>', 'Export results to JSON file')
  .option('--html <filepath>', 'Generate HTML report')
  .option('--endpoint <url>', 'GraphQL endpoint URL')
  .option('--parallel <n>', 'Number of parallel workers', '1')
  .option('--no-metrics', 'Disable metrics tracking')
  .option('--semantic', 'Enable semantic validation (requires OpenAI API key)')
  .option('--compare-baseline <name>', 'Compare results to baseline (use "latest" for most recent)')
  .option('--save-baseline [name]', 'Save results as baseline after test run')
  .option('--fail-on-regression', 'Exit with code 1 if regressions detected')
  .action(async (options) => {
    try {
      const reporter = new ConsoleReporter();
      reporter.printHeader();

      // Configuration
      const config = {
        httpEndpoint: options.endpoint || process.env.GRAPHQL_HTTP_ENDPOINT || 'http://localhost:4001/graphql',
        timeout: parseInt(options.timeout),
        retries: parseInt(options.retries),
        verbose: options.verbose || false,
      };

      console.log(`GraphQL Endpoint: ${config.httpEndpoint}`);

      // Initialize client
      const client = new GraphQLClient({
        httpEndpoint: config.httpEndpoint,
        timeout: config.timeout,
        maxRetries: config.retries,
      });

      // Health check
      reporter.printSection('System Health Check');
      const healthy = await client.healthCheck();
      if (!healthy) {
        console.error('❌ GraphQL server is not responding. Please start the server first.');
        process.exit(1);
      }
      console.log('✓ GraphQL server is healthy');

      // Load scenarios
      reporter.printSection('Loading Scenarios');
      // Handle both running from root and from agent-tester directory
      const cwd = process.cwd();
      const scenariosDir = cwd.endsWith('agent-tester') 
        ? path.join(cwd, 'scenarios')
        : path.join(cwd, 'agent-tester', 'scenarios');
      const loader = new ScenarioLoader(scenariosDir);

      let scenarios;
      if (options.all) {
        scenarios = await loader.loadAll();
        console.log(`Loaded all scenarios from ${scenariosDir}`);
      } else if (options.scenario) {
        const scenario = await loader.loadById(options.scenario);
        if (!scenario) {
          console.error(`❌ Scenario not found: ${options.scenario}`);
          process.exit(1);
        }
        scenarios = [scenario];
        console.log(`Loaded scenario: ${options.scenario}`);
      } else {
        // Load with filters
        const loadOptions: any = {};
        
        if (options.category) {
          loadOptions.category = options.category as ScenarioCategory;
        }
        
        if (options.tags) {
          loadOptions.tags = options.tags.split(',').map((t: string) => t.trim());
        }
        
        if (options.priority) {
          loadOptions.priority = options.priority as Priority;
        }

        scenarios = await loader.load(loadOptions);
        
        if (scenarios.length === 0) {
          console.error('❌ No scenarios found matching filters');
          process.exit(1);
        }

        console.log(`Loaded ${scenarios.length} scenarios`);
      }

      // Initialize validation engine
      const validationEngine = new ValidationEngine({
        openaiApiKey: options.semantic ? process.env.OPENAI_API_KEY : undefined,
        enableSemanticValidation: options.semantic || false,
      });

      // Initialize metrics tracker
      let metricsTracker: MetricsTracker | undefined;
      if (options.metrics !== false) {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-tester';
        metricsTracker = new MetricsTracker({
          mongoUri,
          enabled: true,
          autoConnect: false,
        });
        
        try {
          await metricsTracker.connect();
          console.log('✓ Metrics tracking enabled\n');
        } catch (error: any) {
          console.warn(`⚠ Metrics tracking disabled: ${error.message}\n`);
          metricsTracker = undefined;
        }
      }

      // Initialize test runner (parallel or sequential)
      const parallelWorkers = parseInt(options.parallel || '1');
      let result: TestSuiteResult;

      if (parallelWorkers > 1) {
        console.log(`Using parallel execution with ${parallelWorkers} workers\n`);
        const parallelRunner = new ParallelTestRunner({
          client,
          validationEngine,
          metricsTracker,
          concurrency: parallelWorkers,
          timeout: config.timeout,
          retries: config.retries,
          verbose: config.verbose,
        });

        reporter.printSection('Running Tests');
        result = await parallelRunner.runSuite(scenarios);
      } else {
        const runner = new TestRunner({
          client,
          timeout: config.timeout,
          retries: config.retries,
          verbose: config.verbose,
        });

        reporter.printSection('Running Tests');
        result = await runner.runSuite(scenarios);
      }

      // Disconnect metrics tracker
      if (metricsTracker) {
        await metricsTracker.disconnect();
      }

      // Report results
      if (!config.verbose) {
        for (const testResult of result.scenarios) {
          reporter.reportTest(testResult);
        }
      }

      reporter.reportSummary(result);

      // Regression detection if baseline comparison requested
      let hasRegressions = false;
      if (options.compareBaseline) {
        try {
          reporter.printSection('Regression Detection');
          const baselineManager = new BaselineManager();
          const regressionReporter = new RegressionReporter();
          
          const regressionReport = await baselineManager.compareToBaseline(result, options.compareBaseline);
          regressionReporter.printConsole(regressionReport);
          
          hasRegressions = regressionReport.hasRegressions;
          
          // Add regression report to result for export
          (result as any).regressions = regressionReport;
        } catch (error: any) {
          console.warn(`⚠️  Failed to compare with baseline: ${error.message}`);
        }
      }

      // Save as baseline if requested
      if (options.saveBaseline) {
        try {
          const baselineManager = new BaselineManager();
          const baselineName = typeof options.saveBaseline === 'string' 
            ? options.saveBaseline 
            : undefined;
          await baselineManager.saveBaseline(result, baselineName);
        } catch (error: any) {
          console.error(`❌ Failed to save baseline: ${error.message}`);
        }
      }

      // Export if requested
      if (options.export) {
        const exportPath = path.resolve(options.export);
        reporter.exportJSON(result, exportPath);
      }

      // Generate HTML report if requested
      if (options.html) {
        const htmlPath = path.resolve(options.html);
        const htmlReporter = new HTMLReporter();
        htmlReporter.generateReport(result, htmlPath);
      }

      // Exit with appropriate code
      const shouldFail = result.summary.failed > 0 || (options.failOnRegression && hasRegressions);
      process.exit(shouldFail ? 1 : 0);
    } catch (error: any) {
      console.error('❌ Fatal error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available scenarios')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tags <tags>', 'Filter by tags')
  .option('-p, --priority <priority>', 'Filter by priority')
  .action(async (options) => {
    try {
      // Handle both running from root and from agent-tester directory
      const cwd = process.cwd();
      const scenariosDir = cwd.endsWith('agent-tester') 
        ? path.join(cwd, 'scenarios')
        : path.join(cwd, 'agent-tester', 'scenarios');
      const loader = new ScenarioLoader(scenariosDir);

      const loadOptions: any = {};
      if (options.category) loadOptions.category = options.category;
      if (options.tags) loadOptions.tags = options.tags.split(',');
      if (options.priority) loadOptions.priority = options.priority;

      const scenarios = await loader.load(loadOptions);

      console.log(`\nFound ${scenarios.length} scenarios:\n`);

      // Group by category
      const byCategory = scenarios.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [category, categoryScenarios] of Object.entries(byCategory)) {
        console.log(`\n${category.toUpperCase()}:`);
        for (const scenario of categoryScenarios) {
          const tags = scenario.tags?.length ? ` [${scenario.tags.join(', ')}]` : '';
          console.log(`  ${scenario.id}: ${scenario.name}${tags}`);
        }
      }

      console.log('');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate test scenarios')
  .option('-s, --strategy <type>', 'Generation strategy (template, combinatorial, llm)', 'template')
  .option('-n, --count <number>', 'Number of scenarios to generate', '10')
  .option('-o, --output <dir>', 'Output directory for generated scenarios')
  .option('-f, --focus <topic>', 'Focus area for LLM generation')
  .action(async (options) => {
    await generateCommand({
      strategy: options.strategy as any,
      count: parseInt(options.count),
      output: options.output,
      focus: options.focus,
    });
  });

program
  .command('benchmark')
  .description('Benchmark a scenario with multiple runs')
  .requiredOption('-s, --scenario <id>', 'Scenario ID to benchmark')
  .option('-n, --runs <number>', 'Number of runs', '10')
  .option('-w, --warmup <number>', 'Warmup runs', '2')
  .option('--endpoint <url>', 'GraphQL endpoint URL')
  .action(async (options) => {
    await benchmarkCommand({
      scenario: options.scenario,
      runs: parseInt(options.runs),
      warmup: parseInt(options.warmup),
      endpoint: options.endpoint,
    });
  });

program
  .command('load-test')
  .description('Run load test with concurrent requests')
  .requiredOption('-s, --scenario <id>', 'Scenario ID to test')
  .option('-c, --concurrency <number>', 'Concurrent requests', '10')
  .option('-n, --requests <number>', 'Total requests', '100')
  .option('--endpoint <url>', 'GraphQL endpoint URL')
  .action(async (options) => {
    await loadTestCommand({
      scenario: options.scenario,
      concurrency: parseInt(options.concurrency),
      requests: parseInt(options.requests),
      endpoint: options.endpoint,
    });
  });

program
  .command('baseline')
  .description('Manage test baselines')
  .action(() => {
    console.log('\nBaseline Management Commands:');
    console.log('  baseline save [name]       Save current test results as baseline');
    console.log('  baseline list              List all available baselines');
    console.log('  baseline compare <name>    Compare current results to a baseline');
    console.log('  baseline delete <name>     Delete a baseline\n');
    console.log('Usage with test run:');
    console.log('  agent-tester run --all --save-baseline production-v1');
    console.log('  agent-tester run --all --compare-baseline latest');
    console.log('  agent-tester run --all --compare-baseline latest --fail-on-regression\n');
  });

program
  .command('baseline:list')
  .description('List all available baselines')
  .action(async () => {
    try {
      const baselineManager = new BaselineManager();
      const baselines = await baselineManager.listBaselines();

      if (baselines.length === 0) {
        console.log('\nNo baselines found. Run tests with --save-baseline to create one.\n');
        return;
      }

      console.log(`\n📊 Available Baselines (${baselines.length}):\n`);

      baselines.forEach((baseline) => {
        console.log(`  ${baseline.name}`);
        console.log(`    Date: ${new Date(baseline.timestamp).toLocaleString()}`);
        if (baseline.gitCommit) {
          console.log(`    Git: ${baseline.gitCommit}`);
        }
        console.log(`    Tests: ${baseline.passedTests}/${baseline.totalTests} passed (${baseline.successRate.toFixed(1)}%)`);
        console.log(`    Avg Duration: ${baseline.avgDuration.toFixed(0)}ms`);
        console.log('');
      });
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('baseline:delete')
  .description('Delete a baseline')
  .argument('<name>', 'Baseline name to delete')
  .action(async (name) => {
    try {
      const baselineManager = new BaselineManager();
      await baselineManager.deleteBaseline(name);
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();

