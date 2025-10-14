/**
 * Test script for Agent Configuration API
 * Tests the new GraphQL queries and mutations for agent configuration management
 */

import axios from 'axios';

const GRAPHQL_URL = 'http://localhost:4001/graphql';

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
}

async function query<T = any>(query: string, variables?: any): Promise<GraphQLResponse<T>> {
  try {
    const response = await axios.post(GRAPHQL_URL, {
      query,
      variables,
    });
    return response.data;
  } catch (error: any) {
    console.error('GraphQL request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testListAgentConfigs() {
  console.log('\n📋 Testing listAgentConfigs...');
  const result = await query(`
    query {
      listAgentConfigs {
        id
        name
        type
        version
        isDefault
        isActive
        description
        createdAt
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Found', result.data?.listAgentConfigs?.length, 'configurations');
  console.log('Configs:', JSON.stringify(result.data?.listAgentConfigs, null, 2));
  return true;
}

async function testGetDefaultConfig() {
  console.log('\n🎯 Testing getDefaultConfig for analyzer...');
  const result = await query(`
    query {
      getDefaultConfig(type: analyzer) {
        id
        name
        type
        version
        isDefault
        isActive
        config
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Default analyzer config:');
  console.log(JSON.stringify(result.data?.getDefaultConfig, null, 2));
  return true;
}

async function testListStrategies() {
  console.log('\n🔧 Testing listAnalysisStrategies...');
  const result = await query(`
    query {
      listAnalysisStrategies {
        name
        description
        version
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Available analysis strategies:');
  console.log(JSON.stringify(result.data?.listAnalysisStrategies, null, 2));

  console.log('\n🔧 Testing listSummarizationStrategies...');
  const result2 = await query(`
    query {
      listSummarizationStrategies {
        name
        description
        version
      }
    }
  `);

  if (result2.errors) {
    console.error('❌ Errors:', result2.errors);
    return false;
  }

  console.log('✅ Success! Available summarization strategies:');
  console.log(JSON.stringify(result2.data?.listSummarizationStrategies, null, 2));
  return true;
}

async function testCreateAgentConfig() {
  console.log('\n➕ Testing createAgentConfig...');
  const result = await query(`
    mutation {
      createAgentConfig(input: {
        name: "test-analyzer-config"
        type: analyzer
        description: "Test configuration created via API"
        isDefault: false
        isActive: true
        config: {
          minConfidence: 0.8
          anomalyThreshold: 2.5
          enableChainOfThought: true
          analysisStrategies: ["rule-based"]
        }
      }) {
        id
        name
        type
        version
        isDefault
        isActive
        description
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return null;
  }

  console.log('✅ Success! Created configuration:');
  console.log(JSON.stringify(result.data?.createAgentConfig, null, 2));
  return result.data?.createAgentConfig?.id;
}

async function testUpdateAgentConfig(configId: string) {
  console.log(`\n✏️  Testing updateAgentConfig for ${configId}...`);
  const result = await query(`
    mutation {
      updateAgentConfig(
        id: "${configId}"
        input: {
          description: "Updated test configuration"
          isActive: false
        }
      ) {
        id
        name
        description
        isActive
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Updated configuration:');
  console.log(JSON.stringify(result.data?.updateAgentConfig, null, 2));
  return true;
}

async function testDeleteAgentConfig(configId: string) {
  console.log(`\n🗑️  Testing deleteAgentConfig for ${configId}...`);
  const result = await query(`
    mutation {
      deleteAgentConfig(id: "${configId}")
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Deleted configuration:', result.data?.deleteAgentConfig);
  return true;
}

async function testSubmitFeedback() {
  console.log('\n💬 Testing submitFeedback...');
  
  // First, get a config ID to submit feedback for
  const configsResult = await query(`
    query {
      listAgentConfigs(limit: 1) {
        id
      }
    }
  `);

  const configId = configsResult.data?.listAgentConfigs?.[0]?.id;
  if (!configId) {
    console.error('❌ No configs found to submit feedback for');
    return false;
  }

  const result = await query(`
    mutation {
      submitFeedback(input: {
        requestId: "test-request-123"
        configId: "${configId}"
        agentType: analyzer
        rating: {
          overall: 4
          accuracy: 4
          relevance: 5
          clarity: 4
        }
        suggestions: ["Great analysis!", "Could be more detailed"]
        issues: [
          {
            type: clarity
            severity: low
            description: "Some insights were unclear"
            suggestion: "Add more context"
          }
        ]
      }) {
        id
        requestId
        configId
        agentType
        rating {
          overall
          accuracy
          relevance
          clarity
        }
        createdAt
      }
    }
  `);

  if (result.errors) {
    console.error('❌ Errors:', result.errors);
    return false;
  }

  console.log('✅ Success! Submitted feedback:');
  console.log(JSON.stringify(result.data?.submitFeedback, null, 2));
  return true;
}

async function runTests() {
  console.log('🚀 Starting Agent Configuration API Tests...');
  console.log('GraphQL Endpoint:', GRAPHQL_URL);

  try {
    // Test queries
    await testListAgentConfigs();
    await testGetDefaultConfig();
    await testListStrategies();

    // Test mutations
    const createdConfigId = await testCreateAgentConfig();
    if (createdConfigId) {
      await testUpdateAgentConfig(createdConfigId);
      await testDeleteAgentConfig(createdConfigId);
    }

    // Test feedback
    await testSubmitFeedback();

    console.log('\n✅ All tests completed!');
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();

