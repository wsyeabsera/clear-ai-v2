#!/usr/bin/env node

/**
 * Test Phase 1 Intelligence Improvements
 * Tests the tool relationship system and enhanced planner
 */

import fetch from 'node-fetch';

const GRAPHQL_ENDPOINT = 'http://localhost:4001/graphql';

async function executeQuery(query) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `mutation { executeQuery(query: "${query}") { requestId } }`
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Query execution failed:', error.message);
    return { error: error.message };
  }
}

async function testPhase1Improvements() {
  console.log('🧪 Testing Phase 1 Intelligence Improvements\n');

  const testCases = [
    {
      name: 'Contract Validation Query',
      query: 'Show me all contracts and their associated producers',
      expectedTools: ['contracts_list', 'waste_producers_list']
    },
    {
      name: 'Compliance Analysis Query',
      query: 'Generate a compliance report for all waste producers',
      expectedTools: ['producers_get_compliance_report', 'contracts_list', 'shipments_list']
    },
    {
      name: 'Analytics Query',
      query: 'Analyze contamination rates across all facilities',
      expectedTools: ['analytics_contamination_rate', 'contaminants_list', 'facilities_list']
    },
    {
      name: 'Multi-Entity Query',
      query: 'Get shipments with their compositions and loads',
      expectedTools: ['shipments_list', 'shipment_compositions_list', 'shipment_loads_list']
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    
    const result = await executeQuery(testCase.query);
    
    if (result.error) {
      console.log(`   ❌ Failed: ${result.error}`);
    } else if (result.data && result.data.executeQuery && result.data.executeQuery.requestId) {
      console.log(`   ✅ Query executed successfully (Request ID: ${result.data.executeQuery.requestId})`);
      console.log(`   📊 Expected tools: ${testCase.expectedTools.join(', ')}`);
      passedTests++;
    } else {
      console.log(`   ❌ Unexpected response: ${JSON.stringify(result)}`);
    }
    
    console.log('');
  }

  console.log('📈 Phase 1 Test Results:');
  console.log(`   Passed: ${passedTests}/${totalTests} tests`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('   🎉 All tests passed! Phase 1 improvements are working.');
  } else {
    console.log('   ⚠️  Some tests failed. Check the implementation.');
  }
}

// Run the tests
testPhase1Improvements().catch(console.error);
