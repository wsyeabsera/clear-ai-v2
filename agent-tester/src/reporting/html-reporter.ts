/**
 * HTML Reporter
 * Generates interactive HTML reports from test results
 */

import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import type { TestSuiteResult } from '../types/scenario.js';

export class HTMLReporter {
  private templatePath: string;

  constructor(templatePath?: string) {
    // Default to templates/report.hbs
    const cwd = process.cwd();
    const baseDir = cwd.endsWith('agent-tester') ? cwd : path.join(cwd, 'agent-tester');
    
    this.templatePath = templatePath || path.join(
      baseDir,
      'templates',
      'report.hbs'
    );

    // Register Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Generate HTML report
   */
  generateReport(result: TestSuiteResult, outputPath: string): void {
    try {
      // Read template
      const templateSource = fs.readFileSync(this.templatePath, 'utf8');
      const template = Handlebars.compile(templateSource);

      // Prepare data
      const data = {
        timestamp: result.timestamp.toISOString(),
        summary: result.summary,
        scenarios: result.scenarios,
        failedScenarios: result.scenarios.filter(s => !s.success),
        warningScenarios: result.scenarios.filter(s => 
          s.validationResult.warnings && s.validationResult.warnings.length > 0
        ),
      };

      // Generate HTML
      const html = template(data);

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(outputPath, html);

      console.log(`\n✓ HTML report generated: ${outputPath}`);
    } catch (error: any) {
      console.error(`\n✗ Failed to generate HTML report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format duration
    Handlebars.registerHelper('formatDuration', (ms: number) => {
      if (ms < 1000) {
        return `${ms}ms`;
      } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`;
      } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
      }
    });

    // Round number
    Handlebars.registerHelper('round', (num: number) => {
      return Math.round(num * 100);
    });

    // Format percentage
    Handlebars.registerHelper('percentage', (num: number) => {
      return `${(num * 100).toFixed(1)}%`;
    });
  }
}

