/**
 * Template Generator
 * Generates scenarios from templates with variable substitution
 */

import type { Scenario } from '../types/scenario.js';

export interface ScenarioTemplate {
  name: string;
  category: 'simple' | 'complex' | 'edge-case' | 'performance' | 'memory';
  queryTemplate: string;
  variables: Record<string, string[]>;
  expectedBehavior: any;
  validation: any[];
  priority?: string;
}

export class TemplateGenerator {
  /**
   * Generate scenarios from a template
   */
  generate(template: ScenarioTemplate): Scenario[] {
    const scenarios: Scenario[] = [];
    const variableNames = Object.keys(template.variables);
    
    if (variableNames.length === 0) {
      return [];
    }

    // Generate all combinations
    const combinations = this.generateCombinations(template.variables);

    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      
      // Substitute variables in query
      let query = template.queryTemplate;
      for (const [varName, value] of Object.entries(combo)) {
        query = query.replace(new RegExp(`{{${varName}}}`, 'g'), value);
      }

      // Create scenario
      const scenario: Scenario = {
        id: `${template.category}-gen-${i + 1}`,
        name: `${template.name} - ${Object.values(combo).join(', ')}`,
        category: template.category,
        description: `Generated scenario: ${query}`,
        tags: ['generated', 'template', template.category],
        priority: (template.priority as any) || 'medium',
        query,
        expectedBehavior: template.expectedBehavior,
        validation: template.validation,
      };

      scenarios.push(scenario);
    }

    return scenarios;
  }

  /**
   * Generate all combinations of variables
   */
  private generateCombinations(
    variables: Record<string, string[]>
  ): Record<string, string>[] {
    const entries = Object.entries(variables);
    
    if (entries.length === 0) {
      return [];
    }

    const combinations: Record<string, string>[] = [];

    const generate = (index: number, current: Record<string, string>) => {
      if (index === entries.length) {
        combinations.push({ ...current });
        return;
      }

      const [varName, values] = entries[index];
      for (const value of values) {
        current[varName] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }

  /**
   * Save generated scenarios to files
   */
  async saveScenarios(scenarios: Scenario[], outputDir: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    const yaml = await import('js-yaml');

    if (!fs.default.existsSync(outputDir)) {
      fs.default.mkdirSync(outputDir, { recursive: true });
    }

    for (const scenario of scenarios) {
      const filename = `${scenario.id}.yml`;
      const filepath = path.default.join(outputDir, filename);
      const yamlContent = yaml.default.dump(scenario, { indent: 2 });
      fs.default.writeFileSync(filepath, yamlContent);
    }

    console.log(`✓ Generated ${scenarios.length} scenarios in ${outputDir}`);
  }
}

// Example templates
export const EXAMPLE_TEMPLATES: ScenarioTemplate[] = [
  {
    name: 'List by entity and filter',
    category: 'simple',
    queryTemplate: 'Show me {{entity}} {{filter}}',
    variables: {
      entity: ['shipments', 'facilities', 'contaminants', 'inspections'],
      filter: ['from last week', 'from last month', 'from today'],
    },
    expectedBehavior: {
      toolsUsed: [],
      maxLatencyMs: 15000,
    },
    validation: [
      {
        type: 'performance',
        maxLatencyMs: 15000,
      },
    ],
  },
  
  {
    name: 'Entity with status filter',
    category: 'simple',
    queryTemplate: 'Get {{entity}} with status {{status}}',
    variables: {
      entity: ['shipments', 'inspections'],
      status: ['pending', 'delivered', 'rejected', 'in_transit'],
    },
    expectedBehavior: {
      toolsUsed: [],
      maxLatencyMs: 15000,
    },
    validation: [
      {
        type: 'performance',
        maxLatencyMs: 15000,
      },
    ],
  },
];

