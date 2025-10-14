#!/usr/bin/env tsx

/**
 * Comprehensive GraphQL Schema Test for Deployed Endpoint
 * Tests the deployed GraphQL endpoint against expected schema
 */

import axios from 'axios';
import { typeDefs } from './src/graphql/schema.js';

interface GraphQLIntrospectionResponse {
  data: {
    __schema: {
      queryType: {
        fields: Array<{
          name: string;
          args: Array<{
            name: string;
            type: {
              name?: string;
              kind: string;
              ofType?: {
                name?: string;
                kind: string;
              };
            };
          }>;
        }>;
      };
      mutationType: {
        fields: Array<{
          name: string;
          args: Array<{
            name: string;
            type: {
              name?: string;
              kind: string;
              ofType?: {
                name?: string;
                kind: string;
              };
            };
          }>;
        }>;
      };
      subscriptionType: {
        fields: Array<{
          name: string;
          args: Array<{
            name: string;
            type: {
              name?: string;
              kind: string;
              ofType?: {
                name?: string;
                kind: string;
              };
            };
          }>;
        }>;
      };
    };
  };
}

interface SchemaComparison {
  queries: {
    present: string[];
    missing: string[];
    incorrectSignatures: Array<{
      name: string;
      expected: string;
      actual: string;
    }>;
  };
  mutations: {
    present: string[];
    missing: string[];
    incorrectSignatures: Array<{
      name: string;
      expected: string;
      actual: string;
    }>;
  };
  subscriptions: {
    present: string[];
    missing: string[];
    incorrectSignatures: Array<{
      name: string;
      expected: string;
      actual: string;
    }>;
  };
}

// Expected schema elements from local schema
const EXPECTED_QUERIES = [
  'getRequestHistory',
  'getMemoryContext',
  'getMetrics',
  'getRequest',
  'getPlan',
  'getExecution',
  'getAnalysis',
  'listExecutions',
  'getExecutionStats',
  'getAgentConfig',
  'listAgentConfigs',
  'getDefaultConfig',
  'listAnalysisStrategies',
  'listSummarizationStrategies',
  'getTrainingFeedback',
  'listTrainingFeedback',
  'getTrainingStats'
];

const EXPECTED_MUTATIONS = [
  'planQuery',
  'executeTools',
  'analyzeResults',
  'summarizeResponse',
  'cancelQuery',
  'createAgentConfig',
  'updateAgentConfig',
  'deleteAgentConfig',
  'setDefaultConfig',
  'cloneAgentConfig',
  'submitFeedback',
  'trainConfig',
  'applyTrainingUpdate'
];

const EXPECTED_SUBSCRIPTIONS = [
  'queryProgress',
  'agentStatus',
  'plannerProgress',
  'executorProgress',
  'analyzerProgress',
  'summarizerProgress'
];

// Specific signature checks for critical mutations
const CRITICAL_SIGNATURES = {
  analyzeResults: {
    expected: ['requestId', 'analyzerConfigId'],
    description: 'analyzeResults(requestId: ID!, analyzerConfigId: ID): AnalysisResult!'
  },
  summarizeResponse: {
    expected: ['requestId', 'summarizerConfigId'],
    description: 'summarizeResponse(requestId: ID!, summarizerConfigId: ID): SummaryResult!'
  },
  planQuery: {
    expected: ['query', 'context'],
    description: 'planQuery(query: String!, context: JSON): PlanResult!'
  }
};

async function testSpecificQueries(endpoint: string): Promise<{queries: any[], mutations: any[], subscriptions: any[]}> {
  console.log('🔍 Testing specific queries and mutations (introspection disabled in production)...');
  
  const results = {
    queries: [] as any[],
    mutations: [] as any[],
    subscriptions: [] as any[]
  };

  // Test critical mutations that should be present
  const criticalTests = [
    {
      type: 'mutation',
      name: 'analyzeResults',
      query: `
        mutation TestAnalyzeResults($requestId: ID!, $analyzerConfigId: ID) {
          analyzeResults(requestId: $requestId, analyzerConfigId: $analyzerConfigId) {
            requestId
            analysis {
              summary
            }
          }
        }
      `,
      variables: { requestId: 'test', analyzerConfigId: 'test' }
    },
    {
      type: 'mutation',
      name: 'summarizeResponse',
      query: `
        mutation TestSummarizeResponse($requestId: ID!, $summarizerConfigId: ID) {
          summarizeResponse(requestId: $requestId, summarizerConfigId: $summarizerConfigId) {
            requestId
            message
          }
        }
      `,
      variables: { requestId: 'test', summarizerConfigId: 'test' }
    },
    {
      type: 'mutation',
      name: 'createAgentConfig',
      query: `
        mutation TestCreateAgentConfig($input: CreateAgentConfigInput!) {
          createAgentConfig(input: $input) {
            id
            name
            type
          }
        }
      `,
      variables: { 
        input: { 
          name: 'test', 
          type: 'analyzer', 
          config: {} 
        } 
      }
    },
    {
      type: 'query',
      name: 'listAgentConfigs',
      query: `
        query TestListAgentConfigs {
          listAgentConfigs {
            id
            name
            type
          }
        }
      `,
      variables: {}
    },
    {
      type: 'query',
      name: 'getMetrics',
      query: `
        query TestGetMetrics {
          getMetrics {
            totalRequests
            successfulRequests
          }
        }
      `,
      variables: {}
    }
  ];

  for (const test of criticalTests) {
    try {
      const response = await axios.post(endpoint, {
        query: test.query,
        variables: test.variables
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

      const result = {
        name: test.name,
        available: true,
        response: response.data
      };

      if (test.type === 'query') {
        results.queries.push(result);
      } else {
        results.mutations.push(result);
      }

      console.log(`✅ ${test.name}: Available`);
    } catch (error: any) {
      const result = {
        name: test.name,
        available: false,
        error: error.response?.data?.errors?.[0]?.message || error.message
      };

      if (test.type === 'query') {
        results.queries.push(result);
      } else {
        results.mutations.push(result);
      }

      console.log(`❌ ${test.name}: ${result.error}`);
    }
  }

  return results;
}

function compareSchemas(introspection: GraphQLIntrospectionResponse): SchemaComparison {
  console.log('Debug: introspection response structure:', JSON.stringify(introspection, null, 2));
  
  const schema = introspection.data?.__schema || introspection.__schema;
  if (!schema) {
    throw new Error('No schema found in introspection response');
  }
  
  const deployedQueries = schema.queryType?.fields || [];
  const deployedMutations = schema.mutationType?.fields || [];
  const deployedSubscriptions = schema.subscriptionType?.fields || [];

  const comparison: SchemaComparison = {
    queries: { present: [], missing: [], incorrectSignatures: [] },
    mutations: { present: [], missing: [], incorrectSignatures: [] },
    subscriptions: { present: [], missing: [], incorrectSignatures: [] }
  };

  // Check queries
  for (const expectedQuery of EXPECTED_QUERIES) {
    const deployed = deployedQueries.find(q => q.name === expectedQuery);
    if (deployed) {
      comparison.queries.present.push(expectedQuery);
    } else {
      comparison.queries.missing.push(expectedQuery);
    }
  }

  // Check mutations
  for (const expectedMutation of EXPECTED_MUTATIONS) {
    const deployed = deployedMutations.find(m => m.name === expectedMutation);
    if (deployed) {
      comparison.mutations.present.push(expectedMutation);
      
      // Check critical signatures
      if (CRITICAL_SIGNATURES[expectedMutation as keyof typeof CRITICAL_SIGNATURES]) {
        const expectedArgs = CRITICAL_SIGNATURES[expectedMutation as keyof typeof CRITICAL_SIGNATURES].expected;
        const actualArgs = deployed.args.map(arg => arg.name);
        
        const missingArgs = expectedArgs.filter(arg => !actualArgs.includes(arg));
        if (missingArgs.length > 0) {
          comparison.mutations.incorrectSignatures.push({
            name: expectedMutation,
            expected: CRITICAL_SIGNATURES[expectedMutation as keyof typeof CRITICAL_SIGNATURES].description,
            actual: `${expectedMutation}(${actualArgs.join(', ')})`
          });
        }
      }
    } else {
      comparison.mutations.missing.push(expectedMutation);
    }
  }

  // Check subscriptions
  for (const expectedSubscription of EXPECTED_SUBSCRIPTIONS) {
    const deployed = deployedSubscriptions.find(s => s.name === expectedSubscription);
    if (deployed) {
      comparison.subscriptions.present.push(expectedSubscription);
    } else {
      comparison.subscriptions.missing.push(expectedSubscription);
    }
  }

  return comparison;
}

function generateReport(comparison: SchemaComparison, endpoint: string): string {
  const totalQueries = EXPECTED_QUERIES.length;
  const totalMutations = EXPECTED_MUTATIONS.length;
  const totalSubscriptions = EXPECTED_SUBSCRIPTIONS.length;

  const presentQueries = comparison.queries.present.length;
  const presentMutations = comparison.mutations.present.length;
  const presentSubscriptions = comparison.subscriptions.present.length;

  const missingQueries = comparison.queries.missing.length;
  const missingMutations = comparison.mutations.missing.length;
  const missingSubscriptions = comparison.subscriptions.missing.length;

  const incorrectSignatures = comparison.mutations.incorrectSignatures.length;

  let report = `
# GraphQL Schema Deployment Test Report
**Endpoint**: ${endpoint}
**Tested At**: ${new Date().toISOString()}

## Summary
- **Queries**: ${presentQueries}/${totalQueries} present (${missingQueries} missing)
- **Mutations**: ${presentMutations}/${totalMutations} present (${missingMutations} missing, ${incorrectSignatures} incorrect signatures)
- **Subscriptions**: ${presentSubscriptions}/${totalSubscriptions} present (${missingSubscriptions} missing)

## Detailed Results

### Queries (${presentQueries}/${totalQueries} present)
`;

  // Queries section
  if (comparison.queries.present.length > 0) {
    report += `\n✅ **Present Queries (${comparison.queries.present.length}):**\n`;
    comparison.queries.present.forEach(query => {
      report += `   - ${query}\n`;
    });
  }

  if (comparison.queries.missing.length > 0) {
    report += `\n❌ **Missing Queries (${comparison.queries.missing.length}):**\n`;
    comparison.queries.missing.forEach(query => {
      report += `   - ${query}\n`;
    });
  }

  // Mutations section
  report += `\n### Mutations (${presentMutations}/${totalMutations} present)`;
  
  if (comparison.mutations.present.length > 0) {
    report += `\n\n✅ **Present Mutations (${comparison.mutations.present.length}):**\n`;
    comparison.mutations.present.forEach(mutation => {
      report += `   - ${mutation}\n`;
    });
  }

  if (comparison.mutations.missing.length > 0) {
    report += `\n❌ **Missing Mutations (${comparison.mutations.missing.length}):**\n`;
    comparison.mutations.missing.forEach(mutation => {
      report += `   - ${mutation}\n`;
    });
  }

  if (comparison.mutations.incorrectSignatures.length > 0) {
    report += `\n⚠️ **Incorrect Signatures (${comparison.mutations.incorrectSignatures.length}):**\n`;
    comparison.mutations.incorrectSignatures.forEach(sig => {
      report += `   - **${sig.name}**\n`;
      report += `     Expected: \`${sig.expected}\`\n`;
      report += `     Actual: \`${sig.actual}\`\n\n`;
    });
  }

  // Subscriptions section
  report += `\n### Subscriptions (${presentSubscriptions}/${totalSubscriptions} present)`;
  
  if (comparison.subscriptions.present.length > 0) {
    report += `\n\n✅ **Present Subscriptions (${comparison.subscriptions.present.length}):**\n`;
    comparison.subscriptions.present.forEach(subscription => {
      report += `   - ${subscription}\n`;
    });
  }

  if (comparison.subscriptions.missing.length > 0) {
    report += `\n❌ **Missing Subscriptions (${comparison.subscriptions.missing.length}):**\n`;
    comparison.subscriptions.missing.forEach(subscription => {
      report += `   - ${subscription}\n`;
    });
  }

  // Recommendations
  report += `\n## Recommendations\n`;
  
  if (missingQueries + missingMutations + missingSubscriptions > 0 || incorrectSignatures > 0) {
    report += `\n🚨 **DEPLOYMENT ISSUE DETECTED**\n\n`;
    report += `The deployed schema is missing or has incorrect signatures for critical elements.\n\n`;
    report += `**Immediate Actions Required:**\n`;
    report += `1. **Force Railway rebuild**: Clear deployment cache and rebuild\n`;
    report += `2. **Verify branch**: Ensure the correct branch is deployed\n`;
    report += `3. **Check build logs**: Look for TypeScript compilation errors\n`;
    report += `4. **Environment variables**: Verify all required env vars are set\n\n`;
    
    if (incorrectSignatures > 0) {
      report += `**Critical Signature Issues:**\n`;
      report += `- The \`analyzeResults\` and \`summarizeResponse\` mutations are missing required parameters\n`;
      report += `- This will cause frontend validation errors\n`;
      report += `- The deployment is using an outdated schema version\n\n`;
    }
  } else {
    report += `\n✅ **SCHEMA DEPLOYMENT SUCCESSFUL**\n\n`;
    report += `All expected queries, mutations, and subscriptions are present with correct signatures.\n`;
  }

  return report;
}

async function main() {
  const endpoint = 'https://clear-ai-v2-production.up.railway.app/graphql';
  
  console.log('🔍 Testing deployed GraphQL schema...');
  console.log(`Endpoint: ${endpoint}\n`);

  try {
    // Test basic connectivity
    console.log('📡 Testing endpoint connectivity...');
    const healthResponse = await axios.get(endpoint.replace('/graphql', '/health'), {
      timeout: 5000
    });
    console.log(`✅ Health check passed: ${healthResponse.data.message || 'OK'}\n`);

    // Perform schema introspection
    console.log('🔍 Introspecting GraphQL schema...');
    const introspection = await introspectSchema(endpoint);
    console.log('✅ Schema introspection successful\n');

    // Compare schemas
    console.log('📊 Comparing deployed schema against expected schema...');
    const comparison = compareSchemas(introspection);
    console.log('✅ Schema comparison complete\n');

    // Generate and display report
    const report = generateReport(comparison, endpoint);
    console.log(report);

    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `graphql-schema-test-${timestamp}.md`;
    await import('fs').then(fs => fs.promises.writeFile(filename, report));
    console.log(`\n📄 Report saved to: ${filename}`);

    // Exit with appropriate code
    const hasIssues = comparison.queries.missing.length > 0 || 
                     comparison.mutations.missing.length > 0 || 
                     comparison.subscriptions.missing.length > 0 ||
                     comparison.mutations.incorrectSignatures.length > 0;

    if (hasIssues) {
      console.log('\n❌ Schema test failed - deployment issues detected');
      process.exit(1);
    } else {
      console.log('\n✅ Schema test passed - deployment is correct');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('\n❌ Schema test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
