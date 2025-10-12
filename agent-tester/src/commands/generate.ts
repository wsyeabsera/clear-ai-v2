/**
 * Generate Command
 * CLI command for generating test scenarios
 */

import * as path from 'path';
import { TemplateGenerator, EXAMPLE_TEMPLATES } from '../generators/template-generator.js';
import { CombinatorialGenerator } from '../generators/combinatorial-generator.js';
import { LLMGenerator } from '../generators/llm-generator.js';

export interface GenerateOptions {
  strategy: 'template' | 'combinatorial' | 'llm';
  count?: number;
  output?: string;
  focus?: string;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  console.log(`\n🎲 Generating scenarios using ${options.strategy} strategy...\n`);

  try {
    let scenarios: any[] = [];

    switch (options.strategy) {
      case 'template':
        const templateGen = new TemplateGenerator();
        for (const template of EXAMPLE_TEMPLATES) {
          const generated = templateGen.generate(template);
          scenarios.push(...generated);
        }
        console.log(`✓ Generated ${scenarios.length} scenarios from ${EXAMPLE_TEMPLATES.length} templates`);
        break;

      case 'combinatorial':
        const comboGen = new CombinatorialGenerator();
        const config = {
          tools: ['shipments_list', 'facilities_list', 'contaminants_list', 'inspections_list'],
          filters: {
            shipments_list: {
              status: ['pending', 'in_transit', 'delivered', 'rejected'],
              has_contaminants: ['true', 'false'],
            },
            facilities_list: {
              type: ['sorting', 'processing', 'disposal'],
              location: ['Berlin', 'Hamburg', 'Munich'],
            },
            contaminants_list: {
              risk_level: ['low', 'medium', 'high', 'critical'],
            },
            inspections_list: {
              status: ['accepted', 'rejected', 'pending'],
            },
          },
        };
        
        scenarios = comboGen.generateToolFilterCombinations(config);
        
        if (options.count) {
          scenarios = scenarios.slice(0, options.count);
        }
        
        console.log(`✓ Generated ${scenarios.length} combinatorial scenarios`);
        break;

      case 'llm':
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          console.error('❌ OPENAI_API_KEY not set. Cannot use LLM generation.');
          process.exit(1);
        }

        const llmGen = new LLMGenerator({
          apiKey,
          model: 'gpt-4',
          temperature: 0.8,
        });

        scenarios = await llmGen.generate(options.count || 10, options.focus);
        console.log(`✓ Generated ${scenarios.length} scenarios using LLM`);
        break;

      default:
        console.error(`❌ Unknown strategy: ${options.strategy}`);
        process.exit(1);
    }

    // Save scenarios if output specified
    if (options.output && scenarios.length > 0) {
      const outputDir = path.resolve(options.output);
      const templateGen = new TemplateGenerator();
      templateGen.saveScenarios(scenarios, outputDir);
    } else {
      // Just print summary
      console.log(`\n📋 Generated Scenarios:`);
      for (const scenario of scenarios.slice(0, 10)) {
        console.log(`  - ${scenario.id}: ${scenario.name}`);
      }
      if (scenarios.length > 10) {
        console.log(`  ... and ${scenarios.length - 10} more`);
      }
    }

    console.log(`\n✅ Generation complete!\n`);
  } catch (error: any) {
    console.error(`\n❌ Generation failed: ${error.message}\n`);
    process.exit(1);
  }
}

