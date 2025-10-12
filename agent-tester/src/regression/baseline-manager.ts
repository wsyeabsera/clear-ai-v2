import * as fs from 'fs';
import * as path from 'path';
import type { TestSuiteResult } from '../types/scenario.js';
import type {
  BaselineMetadata,
  BaselineStorage,
  RegressionReport,
  TestRunMetadata,
} from '../types/regression.js';
import { RegressionDetector } from './detector.js';

export class BaselineManager {
  private baselinesDir: string;
  private metadataFile: string;
  private detector: RegressionDetector;

  constructor(baselinesDir?: string) {
    const cwd = process.cwd();
    const baseDir = cwd.endsWith('agent-tester') ? cwd : path.join(cwd, 'agent-tester');
    this.baselinesDir = baselinesDir || path.join(baseDir, 'baselines');
    this.metadataFile = path.join(this.baselinesDir, 'metadata.json');
    this.detector = new RegressionDetector();

    // Ensure baselines directory exists
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
    }
  }

  /**
   * Save a test suite result as a baseline
   */
  async saveBaseline(result: TestSuiteResult, name?: string): Promise<void> {
    const baselineName = name || this.generateBaselineName();
    const baseline = {
      metadata: this.createMetadata(baselineName, result),
      results: result,
    };

    // Save baseline file
    const filename = `${baselineName}.json`;
    const filepath = path.join(this.baselinesDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(baseline, null, 2));

    // Update metadata index
    this.updateMetadataIndex(baselineName, baseline.metadata);

    // Update 'latest' symlink/reference
    this.updateLatest(baselineName);

    console.log(`✅ Baseline saved: ${baselineName}`);
    console.log(`   Location: ${filepath}`);
    console.log(`   Tests: ${result.summary.total} (${result.summary.passed} passed)`);
    console.log(`   Success Rate: ${result.summary.successRate.toFixed(1)}%\n`);
  }

  /**
   * Load a baseline by name
   */
  async loadBaseline(name?: string): Promise<TestSuiteResult | null> {
    const baselineName = name || 'latest';

    // If loading 'latest', get actual latest name from metadata
    let actualName = baselineName;
    if (baselineName === 'latest') {
      const storage = this.loadMetadataIndex();
      actualName = storage.latest || '';
      if (!actualName) {
        console.warn('No latest baseline found');
        return null;
      }
    }

    const filepath = path.join(this.baselinesDir, `${actualName}.json`);

    if (!fs.existsSync(filepath)) {
      console.warn(`Baseline not found: ${actualName}`);
      return null;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const baseline = JSON.parse(content);
    return baseline.results;
  }

  /**
   * List all available baselines
   */
  async listBaselines(): Promise<BaselineMetadata[]> {
    const storage = this.loadMetadataIndex();
    return Object.keys(storage.baselines).map(name => storage.baselines[name].metadata);
  }

  /**
   * Compare current results to a baseline
   */
  async compareToBaseline(
    current: TestSuiteResult,
    baselineName?: string
  ): Promise<RegressionReport> {
    const baseline = await this.loadBaseline(baselineName);

    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineName || 'latest'}`);
    }

    // Get metadata for comparison
    const storage = this.loadMetadataIndex();
    let actualName = baselineName || 'latest';
    if (actualName === 'latest') {
      actualName = storage.latest!;
    }

    const baselineMetadata = storage.baselines[actualName].metadata;
    const currentMetadata = this.createTestRunMetadata(current);

    // Use detector to find regressions
    return this.detector.detect(baseline, current, baselineMetadata, currentMetadata);
  }

  /**
   * Delete a baseline
   */
  async deleteBaseline(name: string): Promise<void> {
    const filepath = path.join(this.baselinesDir, `${name}.json`);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Baseline not found: ${name}`);
    }

    fs.unlinkSync(filepath);

    // Remove from metadata index
    const storage = this.loadMetadataIndex();
    delete storage.baselines[name];

    if (storage.latest === name) {
      // Find new latest
      const baselines = Object.keys(storage.baselines);
      storage.latest = baselines.length > 0 ? baselines[baselines.length - 1] : undefined;
    }

    this.saveMetadataIndex(storage);

    console.log(`✅ Baseline deleted: ${name}`);
  }

  // Private helper methods

  private generateBaselineName(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS
    
    // Try to get git commit hash
    try {
      const { execSync } = require('child_process');
      const commit = execSync('git rev-parse --short HEAD').toString().trim();
      return `baseline-${date}-${time}-${commit}`;
    } catch {
      return `baseline-${date}-${time}`;
    }
  }

  private createMetadata(name: string, result: TestSuiteResult): BaselineMetadata {
    let gitCommit: string | undefined;
    try {
      const { execSync } = require('child_process');
      gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
      // Git not available or not a git repo
    }

    return {
      name,
      timestamp: result.timestamp,
      gitCommit,
      totalTests: result.summary.total,
      passedTests: result.summary.passed,
      failedTests: result.summary.failed,
      successRate: result.summary.successRate,
      avgDuration: result.summary.avgDuration,
    };
  }

  private createTestRunMetadata(result: TestSuiteResult): TestRunMetadata {
    return {
      timestamp: result.timestamp,
      totalTests: result.summary.total,
      passedTests: result.summary.passed,
      failedTests: result.summary.failed,
      successRate: result.summary.successRate,
      avgDuration: result.summary.avgDuration,
    };
  }

  private loadMetadataIndex(): BaselineStorage {
    if (!fs.existsSync(this.metadataFile)) {
      return {
        version: '1.0.0',
        baselines: {},
      };
    }

    const content = fs.readFileSync(this.metadataFile, 'utf-8');
    return JSON.parse(content);
  }

  private saveMetadataIndex(storage: BaselineStorage): void {
    fs.writeFileSync(this.metadataFile, JSON.stringify(storage, null, 2));
  }

  private updateMetadataIndex(name: string, metadata: BaselineMetadata): void {
    const storage = this.loadMetadataIndex();
    storage.baselines[name] = { metadata, results: {} as any }; // Results stored separately
    this.saveMetadataIndex(storage);
  }

  private updateLatest(name: string): void {
    const storage = this.loadMetadataIndex();
    storage.latest = name;
    this.saveMetadataIndex(storage);
  }
}

