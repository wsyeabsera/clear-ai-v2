/**
 * Combinatorial Generator
 * Generates scenarios testing all combinations of tools and filters
 */

import type { Scenario } from '../types/scenario.js';

export interface CombinationConfig {
  tools: string[];
  filters: {
    [toolName: string]: {
      [filterName: string]: string[];
    };
  };
}

export class CombinatorialGenerator {
  /**
   * Generate scenarios for all tool/filter combinations
   */
  generateToolFilterCombinations(config: CombinationConfig): Scenario[] {
    const scenarios: Scenario[] = [];
    let scenarioId = 1;

    for (const tool of config.tools) {
      const toolFilters = config.filters[tool] || {};

      // No filters - just list all
      scenarios.push(this.createScenario(
        `combo-${scenarioId++}`,
        tool,
        null,
        null
      ));

      // Each filter individually
      for (const [filterName, filterValues] of Object.entries(toolFilters)) {
        for (const filterValue of filterValues) {
          scenarios.push(this.createScenario(
            `combo-${scenarioId++}`,
            tool,
            filterName,
            filterValue
          ));
        }
      }
    }

    return scenarios;
  }

  /**
   * Create a scenario for a tool/filter combination
   */
  private createScenario(
    id: string,
    tool: string,
    filterName: string | null,
    filterValue: string | null
  ): Scenario {
    // Build query
    const entityName = tool.replace('_list', '').replace('_', ' ');
    let query = `Show me all ${entityName}`;
    
    if (filterName && filterValue) {
      query += ` ${this.filterToQuery(filterName, filterValue)}`;
    }

    // Determine expected tool name
    const expectedTool = tool.includes('_list') ? tool : `${tool}_list`;

    return {
      id,
      name: `${tool}${filterName ? ` with ${filterName}=${filterValue}` : ''}`,
      category: 'simple',
      description: `Combinatorially generated test for ${tool}`,
      tags: ['generated', 'combinatorial', tool.split('_')[0]],
      priority: 'medium',
      query,
      expectedBehavior: {
        toolsUsed: [expectedTool],
        maxLatencyMs: 15000,
        minResults: 0,
      },
      validation: [
        {
          type: 'tool_selection',
          expected: [expectedTool],
          allowExtra: true,
        },
        {
          type: 'performance',
          maxLatencyMs: 15000,
        },
      ],
    };
  }

  /**
   * Convert filter name/value to natural language
   */
  private filterToQuery(filterName: string, filterValue: string): string {
    const mappings: Record<string, string> = {
      status: `with status ${filterValue}`,
      location: `in ${filterValue}`,
      type: `of type ${filterValue}`,
      facility_id: `for facility ${filterValue}`,
      risk_level: `with ${filterValue} risk`,
      date_from: `from ${filterValue}`,
      has_contaminants: filterValue === 'true' ? 'that are contaminated' : 'without contamination',
    };

    return mappings[filterName] || `where ${filterName} is ${filterValue}`;
  }

  /**
   * Generate all pairwise combinations
   */
  generatePairwise(tools: string[]): Scenario[] {
    const scenarios: Scenario[] = [];
    let scenarioId = 1;

    // Generate all pairs
    for (let i = 0; i < tools.length; i++) {
      for (let j = i + 1; j < tools.length; j++) {
        const tool1 = tools[i];
        const tool2 = tools[j];

        scenarios.push({
          id: `pairwise-${scenarioId++}`,
          name: `Pairwise: ${tool1} + ${tool2}`,
          category: 'complex',
          description: `Test interaction between ${tool1} and ${tool2}`,
          tags: ['generated', 'pairwise', 'multi-tool'],
          priority: 'low',
          query: `Analyze ${tool1.replace('_list', '')} and ${tool2.replace('_list', '')} together`,
          expectedBehavior: {
            toolsUsed: [tool1, tool2],
            maxLatencyMs: 20000,
          },
          validation: [
            {
              type: 'tool_selection',
              expected: [tool1],
              allowExtra: true,
            },
            {
              type: 'performance',
              maxLatencyMs: 20000,
            },
          ],
        });
      }
    }

    return scenarios;
  }
}

