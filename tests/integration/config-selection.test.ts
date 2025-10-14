/**
 * Integration tests for agent configuration selection
 * 
 * These tests verify that:
 * 1. Analyzer configs are properly applied when specified
 * 2. Summarizer configs are properly applied when specified
 * 3. Default configs are used when no config is specified
 * 4. Different configs produce different results
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:4001/graphql';

interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string; extensions?: any }>;
}

async function query(gql: string): Promise<GraphQLResponse> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: gql }),
  });

  return response.json();
}

describe('Agent Configuration Selection', () => {
  let testRequestId: string;
  let analyzerConfigs: any[];
  let summarizerConfigs: any[];

  beforeAll(async () => {
    // Fetch available configs
    const configsResult = await query(`
      query {
        listAgentConfigs(isActive: true) {
          id
          name
          type
          isDefault
          config
        }
      }
    `);

    const configs = configsResult.data?.listAgentConfigs || [];
    analyzerConfigs = configs.filter((c: any) => c.type === 'analyzer');
    summarizerConfigs = configs.filter((c: any) => c.type === 'summarizer');

    expect(analyzerConfigs.length).toBeGreaterThanOrEqual(2);
    expect(summarizerConfigs.length).toBeGreaterThanOrEqual(1);

    // Create a test request
    const planResult = await query(`
      mutation {
        planQuery(query: "Test query for config selection") {
          requestId
        }
      }
    `);

    testRequestId = planResult.data?.planQuery?.requestId;
    expect(testRequestId).toBeDefined();

    // Execute the plan
    const executeResult = await query(`
      mutation {
        executeTools(requestId: "${testRequestId}") {
          requestId
        }
      }
    `);

    expect(executeResult.data?.executeTools?.requestId).toBe(testRequestId);
  });

  describe('Analyzer Configuration', () => {
    it('should use default analyzer config when no config is specified', async () => {
      const result = await query(`
        mutation {
          analyzeResults(requestId: "${testRequestId}") {
            requestId
            analysis {
              summary
              insights {
                confidence
              }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.analyzeResults?.requestId).toBe(testRequestId);
      expect(result.data?.analyzeResults?.analysis).toBeDefined();
    });

    it('should apply custom analyzer config when specified', async () => {
      const highConfidenceConfig = analyzerConfigs.find(
        (c: any) => c.config.minConfidence === 0.9
      ) || analyzerConfigs[0];

      const result = await query(`
        mutation {
          analyzeResults(
            requestId: "${testRequestId}"
            analyzerConfigId: "${highConfidenceConfig.id}"
          ) {
            requestId
            analysis {
              summary
              insights {
                confidence
              }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.analyzeResults?.requestId).toBe(testRequestId);
      
      // With high confidence threshold, we expect fewer insights
      const insights = result.data?.analyzeResults?.analysis?.insights || [];
      insights.forEach((insight: any) => {
        // All insights should meet or exceed the minimum confidence
        expect(insight.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should produce different results with different configs', async () => {
      if (analyzerConfigs.length < 2) {
        console.log('Skipping: Need at least 2 analyzer configs');
        return;
      }

      const config1 = analyzerConfigs[0];
      const config2 = analyzerConfigs[1];

      const result1 = await query(`
        mutation {
          analyzeResults(
            requestId: "${testRequestId}"
            analyzerConfigId: "${config1.id}"
          ) {
            analysis {
              insights {
                confidence
              }
            }
          }
        }
      `);

      const result2 = await query(`
        mutation {
          analyzeResults(
            requestId: "${testRequestId}"
            analyzerConfigId: "${config2.id}"
          ) {
            analysis {
              insights {
                confidence
              }
            }
          }
        }
      `);

      const insights1 = result1.data?.analyzeResults?.analysis?.insights || [];
      const insights2 = result2.data?.analyzeResults?.analysis?.insights || [];

      // Results should be different (unless configs are identical)
      if (config1.config.minConfidence !== config2.config.minConfidence) {
        expect(insights1.length).not.toBe(insights2.length);
      }
    });
  });

  describe('Summarizer Configuration', () => {
    it('should use default summarizer config when no config is specified', async () => {
      const result = await query(`
        mutation {
          summarizeResponse(requestId: "${testRequestId}") {
            requestId
            message
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.summarizeResponse?.requestId).toBe(testRequestId);
      expect(result.data?.summarizeResponse?.message).toBeDefined();
      expect(result.data?.summarizeResponse?.message.length).toBeGreaterThan(0);
    });

    it('should apply custom summarizer config when specified', async () => {
      const customConfig = summarizerConfigs.find(
        (c: any) => !c.isDefault
      ) || summarizerConfigs[0];

      const result = await query(`
        mutation {
          summarizeResponse(
            requestId: "${testRequestId}"
            summarizerConfigId: "${customConfig.id}"
          ) {
            requestId
            message
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.summarizeResponse?.requestId).toBe(testRequestId);
      expect(result.data?.summarizeResponse?.message).toBeDefined();
    });

    it('should produce different results with different configs', async () => {
      if (summarizerConfigs.length < 2) {
        console.log('Skipping: Need at least 2 summarizer configs');
        return;
      }

      const config1 = summarizerConfigs[0];
      const config2 = summarizerConfigs[1];

      const result1 = await query(`
        mutation {
          summarizeResponse(
            requestId: "${testRequestId}"
            summarizerConfigId: "${config1.id}"
          ) {
            message
          }
        }
      `);

      const result2 = await query(`
        mutation {
          summarizeResponse(
            requestId: "${testRequestId}"
            summarizerConfigId: "${config2.id}"
          ) {
            message
          }
        }
      `);

      const message1 = result1.data?.summarizeResponse?.message || '';
      const message2 = result2.data?.summarizeResponse?.message || '';

      // Results should be different (unless configs are identical)
      if (config1.config.maxLength !== config2.config.maxLength ||
          config1.config.tone !== config2.config.tone) {
        expect(message1).not.toBe(message2);
      }
    });
  });

  describe('End-to-End Configuration Flow', () => {
    it('should allow full pipeline with custom configs', async () => {
      const customAnalyzer = analyzerConfigs[0];
      const customSummarizer = summarizerConfigs[0];

      // Create new request
      const planResult = await query(`
        mutation {
          planQuery(query: "End-to-end test with custom configs") {
            requestId
          }
        }
      `);

      const requestId = planResult.data?.planQuery?.requestId;
      expect(requestId).toBeDefined();

      // Execute
      await query(`
        mutation {
          executeTools(requestId: "${requestId}") {
            requestId
          }
        }
      `);

      // Analyze with custom config
      const analyzeResult = await query(`
        mutation {
          analyzeResults(
            requestId: "${requestId}"
            analyzerConfigId: "${customAnalyzer.id}"
          ) {
            requestId
            analysis {
              summary
            }
          }
        }
      `);

      expect(analyzeResult.errors).toBeUndefined();

      // Summarize with custom config
      const summarizeResult = await query(`
        mutation {
          summarizeResponse(
            requestId: "${requestId}"
            summarizerConfigId: "${customSummarizer.id}"
          ) {
            requestId
            message
          }
        }
      `);

      expect(summarizeResult.errors).toBeUndefined();
      expect(summarizeResult.data?.summarizeResponse?.message).toBeDefined();
    });
  });
});

