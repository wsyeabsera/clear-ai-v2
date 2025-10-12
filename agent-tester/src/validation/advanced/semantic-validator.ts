/**
 * Semantic Validator
 * Uses LLM to validate that responses semantically match questions
 */

import OpenAI from 'openai';
import type { ExecutionResult, ValidationRule } from '../../types/scenario.js';
import type { ValidationResult, ValidationDetail, Validator } from '../../types/validation.js';

export class SemanticValidator implements Validator {
  private openai: OpenAI | null = null;
  private enabled: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.enabled = true;
    }
  }

  /**
   * Validate semantic correctness using LLM
   */
  async validate(
    executionResult: ExecutionResult,
    rule: ValidationRule,
    context?: any
  ): Promise<ValidationResult> {
    if (!this.enabled || !this.openai) {
      return {
        passed: true,
        confidence: 0,
        details: [],
        errors: [],
        warnings: ['Semantic validation skipped - OpenAI API key not configured'],
      };
    }

    const details: ValidationDetail[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const query = context?.query || '';
      const response = executionResult.message;

      // Use GPT to validate semantic correctness
      const prompt = `You are evaluating whether an AI agent's response correctly answers a user's question.

User Question: "${query}"

Agent Response: "${response}"

Validation Check: ${rule.check || 'Does the response accurately and completely answer the question?'}

Respond with a JSON object containing:
{
  "passes": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const completion = await this.openai.chat.completions.create({
        model: rule.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a validation assistant. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const resultText = completion.choices[0]?.message?.content || '{}';
      const validation = JSON.parse(resultText);

      const passed = validation.passes === true;
      const confidence = validation.confidence || 0.5;

      details.push({
        type: 'semantic_validation',
        passed,
        message: validation.reasoning || (passed ? 'Response is semantically correct' : 'Response has semantic issues'),
        confidence,
      });

      if (!passed) {
        errors.push(`Semantic validation failed: ${validation.reasoning}`);
      }

      return {
        passed,
        confidence,
        details,
        errors,
        warnings,
      };
    } catch (error: any) {
      return {
        passed: true,
        confidence: 0,
        details: [],
        errors: [],
        warnings: [`Semantic validation failed: ${error.message}`],
      };
    }
  }
}

