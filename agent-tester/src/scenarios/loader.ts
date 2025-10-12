/**
 * Scenario Loader
 * Loads and parses YAML test scenarios
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Scenario, ScenarioCategory, Priority } from '../types/scenario.js';

export interface LoadOptions {
  category?: ScenarioCategory;
  tags?: string[];
  priority?: Priority;
  scenarioIds?: string[];
}

export class ScenarioLoader {
  private scenariosDir: string;

  constructor(scenariosDir: string) {
    this.scenariosDir = scenariosDir;
  }

  /**
   * Load all scenarios from a directory
   */
  async loadAll(): Promise<Scenario[]> {
    return this.loadScenarios(this.scenariosDir);
  }

  /**
   * Load scenarios with filtering
   */
  async load(options: LoadOptions = {}): Promise<Scenario[]> {
    let scenarios = await this.loadAll();

    // Filter by category
    if (options.category) {
      scenarios = scenarios.filter((s) => s.category === options.category);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      scenarios = scenarios.filter((s) =>
        options.tags!.some((tag) => s.tags?.includes(tag))
      );
    }

    // Filter by priority
    if (options.priority) {
      scenarios = scenarios.filter((s) => s.priority === options.priority);
    }

    // Filter by scenario IDs
    if (options.scenarioIds && options.scenarioIds.length > 0) {
      scenarios = scenarios.filter((s) => options.scenarioIds!.includes(s.id));
    }

    return scenarios;
  }

  /**
   * Load a single scenario by ID
   */
  async loadById(scenarioId: string): Promise<Scenario | null> {
    const scenarios = await this.loadAll();
    return scenarios.find((s) => s.id === scenarioId) || null;
  }

  /**
   * Recursively load scenarios from directory
   */
  private async loadScenarios(dir: string): Promise<Scenario[]> {
    const scenarios: Scenario[] = [];

    if (!fs.existsSync(dir)) {
      return scenarios;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively load from subdirectories
        const subScenarios = await this.loadScenarios(fullPath);
        scenarios.push(...subScenarios);
      } else if (entry.isFile() && this.isYamlFile(entry.name)) {
        // Load and parse YAML file
        try {
          const scenario = await this.loadScenarioFile(fullPath);
          if (scenario) {
            scenarios.push(scenario);
          }
        } catch (error: any) {
          console.warn(`Failed to load scenario from ${fullPath}: ${error.message}`);
        }
      }
    }

    return scenarios;
  }

  /**
   * Load and parse a single scenario file
   */
  private async loadScenarioFile(filePath: string): Promise<Scenario | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content) as any;

      // Validate required fields
      if (!data.id || !data.name || !data.category || !data.query) {
        console.warn(`Invalid scenario in ${filePath}: missing required fields`);
        return null;
      }

      // Set defaults
      const scenario: Scenario = {
        id: data.id,
        name: data.name,
        category: data.category,
        description: data.description,
        tags: data.tags || [],
        priority: data.priority || 'medium',
        query: data.query,
        userId: data.userId,
        context: data.context,
        expectedBehavior: {
          toolsUsed: data.expectedBehavior?.toolsUsed || [],
          toolSequence: data.expectedBehavior?.toolSequence || 'any',
          minResults: data.expectedBehavior?.minResults,
          maxResults: data.expectedBehavior?.maxResults,
          responseContains: data.expectedBehavior?.responseContains || [],
          responseNotContains: data.expectedBehavior?.responseNotContains || [],
          maxLatencyMs: data.expectedBehavior?.maxLatencyMs || 30000,
          maxTokens: data.expectedBehavior?.maxTokens,
          analysisRequired: data.expectedBehavior?.analysisRequired,
          entitiesExpected: data.expectedBehavior?.entitiesExpected || [],
        },
        validation: data.validation || [],
        timeout: data.timeout,
        retries: data.retries,
        skipIf: data.skipIf,
      };

      return scenario;
    } catch (error: any) {
      throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if file is a YAML file
   */
  private isYamlFile(filename: string): boolean {
    return filename.endsWith('.yml') || filename.endsWith('.yaml');
  }

  /**
   * Validate scenario structure
   */
  validateScenario(scenario: Scenario): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scenario.id) errors.push('Missing required field: id');
    if (!scenario.name) errors.push('Missing required field: name');
    if (!scenario.category) errors.push('Missing required field: category');
    if (!scenario.query) errors.push('Missing required field: query');
    if (!scenario.expectedBehavior) errors.push('Missing required field: expectedBehavior');
    if (!scenario.validation || scenario.validation.length === 0) {
      errors.push('At least one validation rule is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

