/**
 * LLM Generator
 * Uses GPT-4 to generate realistic test scenarios
 */

import OpenAI from 'openai';
import type { Scenario } from '../types/scenario.js';

export interface LLMGeneratorConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export class LLMGenerator {
  private openai: OpenAI;
  private config: LLMGeneratorConfig;

  constructor(config: LLMGeneratorConfig) {
    this.config = {
      model: 'gpt-4',
      temperature: 0.8,
      ...config,
    };

    this.openai = new OpenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Generate test scenarios using LLM
   */
  async generate(count: number, focus?: string): Promise<Scenario[]> {
    const scenarios: Scenario[] = [];

    const prompt = `Generate ${count} realistic test scenarios for a waste management agent system.

The system has these capabilities:
- Query shipments (list, filter by date, status, facility, contamination)
- Query facilities (list, filter by location, type, capacity)
- Query contaminants (list, filter by risk level, type, shipment)
- Query inspections (list, filter by facility, status)
- Analytics (contamination rates, facility performance, waste distribution)

${focus ? `Focus on: ${focus}` : ''}

Generate diverse, realistic queries that users might ask. Include:
- Simple queries (single tool)
- Complex queries (multiple tools, analysis)
- Edge cases (unusual requests)

For each scenario, provide:
1. A natural language query
2. Expected tools to be used
3. Category (simple, complex, or edge-case)
4. Brief description

Return as JSON array with format:
[
  {
    "query": "user query here",
    "expectedTools": ["tool_name"],
    "category": "simple",
    "description": "what this tests"
  }
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a test scenario generator. Create diverse, realistic test cases. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const generatedScenarios = JSON.parse(content);

      // Convert to Scenario objects
      for (let i = 0; i < generatedScenarios.length; i++) {
        const gen = generatedScenarios[i];
        
        const scenario: Scenario = {
          id: `llm-gen-${Date.now()}-${i}`,
          name: gen.query.substring(0, 60),
          category: gen.category || 'simple',
          description: gen.description || `Generated scenario: ${gen.query}`,
          tags: ['generated', 'llm', ...(gen.expectedTools || [])],
          priority: 'medium',
          query: gen.query,
          expectedBehavior: {
            toolsUsed: gen.expectedTools || [],
            maxLatencyMs: gen.category === 'complex' ? 25000 : 15000,
            minResults: 0,
          },
          validation: [
            {
              type: 'tool_selection',
              expected: gen.expectedTools || [],
              allowExtra: true,
            },
            {
              type: 'performance',
              maxLatencyMs: gen.category === 'complex' ? 25000 : 15000,
            },
          ],
        };

        scenarios.push(scenario);
      }

      console.log(`✓ Generated ${scenarios.length} scenarios using LLM`);
      return scenarios;
    } catch (error: any) {
      console.error('Failed to generate scenarios with LLM:', error.message);
      return [];
    }
  }

  /**
   * Generate adversarial test cases
   */
  async generateAdversarial(count: number): Promise<Scenario[]> {
    const prompt = `Generate ${count} challenging/adversarial test cases for a waste management agent system.

Create queries that are:
- Ambiguous or unclear
- Edge cases
- Potentially problematic
- Test error handling
- Stress boundary conditions

Return as JSON array with same format as before.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are an adversarial test generator. Create challenging edge cases.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const generatedScenarios = JSON.parse(content);

      return generatedScenarios.map((gen: any, i: number) => ({
        id: `adversarial-${Date.now()}-${i}`,
        name: gen.query.substring(0, 60),
        category: 'edge-case',
        description: gen.description || `Adversarial scenario: ${gen.query}`,
        tags: ['generated', 'adversarial', 'edge-case'],
        priority: 'low',
        query: gen.query,
        expectedBehavior: {
          toolsUsed: gen.expectedTools || [],
          maxLatencyMs: 20000,
        },
        validation: [
          {
            type: 'error_handling',
            expectError: false,
            expectGracefulResponse: true,
          },
        ],
      }));
    } catch (error: any) {
      console.error('Failed to generate adversarial scenarios:', error.message);
      return [];
    }
  }
}

