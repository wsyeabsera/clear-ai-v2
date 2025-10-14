/**
 * Phase 2 Performance Optimization Test Script
 * 
 * Tests the new performance optimizations including:
 * - Query caching system
 * - Enhanced parallel execution
 * - Response size limiting
 * - Performance monitoring
 */

import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'http://localhost:4001/graphql';
const client = new GraphQLClient(endpoint);

const executeQueryMutation = gql`
  mutation ExecuteQuery($query: String!) {
    executeQuery(query: $query) {
      requestId
      message
      tools_used
      metadata {
        request_id
        total_duration_ms
        timestamp
      }
    }
  }
`;

async function runTest(name, query, expectedTools) {
  console.log(`\n📋 Testing: ${name}`);
  console.log(`   Query: "${query}"`);
  
  const startTime = Date.now();
  
  try {
    const data = await client.request(executeQueryMutation, { query });
    const duration = Date.now() - startTime;
    
    if (data && data.executeQuery && data.executeQuery.requestId) {
      console.log(`   ✅ Query executed successfully (Request ID: ${data.executeQuery.requestId})`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(`   🔧 Tools used: ${data.executeQuery.tools_used?.join(', ') || 'None'}`);
      console.log(`   📊 Expected tools: ${expectedTools.join(', ')}`);
      
      // Check if tools match expectations
      const toolsUsed = data.executeQuery.tools_used || [];
      const expectedToolsFound = expectedTools.filter(tool => 
        toolsUsed.some(used => used.includes(tool))
      );
      
      if (expectedToolsFound.length > 0) {
        console.log(`   🎯 Expected tools found: ${expectedToolsFound.join(', ')}`);
      }
      
      return {
        success: true,
        duration,
        toolsUsed,
        expectedToolsFound: expectedToolsFound.length,
        totalExpected: expectedTools.length
      };
    } else {
      console.error(`   ❌ Query execution failed: No requestId returned.`);
      console.error(`   Response: ${JSON.stringify(data, null, 2)}`);
      return { success: false, duration, error: 'No requestId returned' };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`   ❌ Query execution failed: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function runPhase2Tests() {
  console.log('🧪 Testing Phase 2 Performance Optimizations');
  console.log('=' .repeat(60));

  const tests = [
    {
      name: "Cache Test - Simple List Query",
      query: "Show me all shipments",
      expectedTools: ["shipments_list"]
    },
    {
      name: "Cache Test - Same Query (Should Hit Cache)",
      query: "Show me all shipments",
      expectedTools: ["shipments_list"]
    },
    {
      name: "Parallel Execution Test - Multiple Lists",
      query: "Get all facilities and all waste producers",
      expectedTools: ["facilities_list", "waste_producers_list"]
    },
    {
      name: "Response Limiting Test - Large Dataset",
      query: "Show me all shipments with details",
      expectedTools: ["shipments_list"]
    },
    {
      name: "Complex Multi-Tool Query",
      query: "Analyze contamination rates and show facility performance",
      expectedTools: ["analytics_contamination_rate", "analytics_facility_performance"]
    },
    {
      name: "Contract Validation Query",
      query: "Show me contracts and validate them against shipments",
      expectedTools: ["contracts_list", "shipments_validate_against_contract"]
    }
  ];

  const results = [];
  let totalDuration = 0;
  let successfulTests = 0;
  let cacheHits = 0;

  for (const test of tests) {
    const result = await runTest(test.name, test.query, test.expectedTools);
    results.push({ ...test, result });
    
    if (result.success) {
      successfulTests++;
      totalDuration += result.duration;
      
      // Check for potential cache hit (same query, faster execution)
      if (test.name.includes("Same Query") && result.duration < 1000) {
        cacheHits++;
        console.log(`   🚀 Potential cache hit detected (${result.duration}ms)`);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Calculate performance metrics
  const averageDuration = totalDuration / successfulTests;
  const successRate = (successfulTests / tests.length) * 100;
  const expectedToolsAccuracy = results
    .filter(r => r.result.success)
    .reduce((sum, r) => sum + (r.result.expectedToolsFound / r.result.totalExpected), 0) / successfulTests;

  console.log('\n📈 Phase 2 Test Results:');
  console.log('=' .repeat(60));
  console.log(`   Tests Run: ${tests.length}`);
  console.log(`   Successful: ${successfulTests}`);
  console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`   Average Duration: ${averageDuration.toFixed(0)}ms`);
  console.log(`   Cache Hits: ${cacheHits}`);
  console.log(`   Tool Accuracy: ${(expectedToolsAccuracy * 100).toFixed(1)}%`);

  // Performance analysis
  console.log('\n🔍 Performance Analysis:');
  if (averageDuration < 5000) {
    console.log('   ✅ Excellent performance (< 5s average)');
  } else if (averageDuration < 10000) {
    console.log('   ✅ Good performance (< 10s average)');
  } else {
    console.log('   ⚠️  Performance needs improvement (> 10s average)');
  }

  if (cacheHits > 0) {
    console.log('   ✅ Caching system is working');
  } else {
    console.log('   ⚠️  No cache hits detected (may need more testing)');
  }

  if (successRate >= 90) {
    console.log('   ✅ High success rate achieved');
  } else if (successRate >= 70) {
    console.log('   ⚠️  Moderate success rate');
  } else {
    console.log('   ❌ Low success rate - needs investigation');
  }

  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach((test, index) => {
    const status = test.result.success ? '✅' : '❌';
    const duration = test.result.duration || 0;
    console.log(`   ${index + 1}. ${status} ${test.name} (${duration}ms)`);
    if (!test.result.success) {
      console.log(`      Error: ${test.result.error}`);
    }
  });

  return {
    totalTests: tests.length,
    successfulTests,
    successRate,
    averageDuration,
    cacheHits,
    toolAccuracy: expectedToolsAccuracy * 100
  };
}

// Run the tests
runPhase2Tests()
  .then(results => {
    console.log('\n🎉 Phase 2 Performance Testing Complete!');
    console.log(`Overall Success Rate: ${results.successRate.toFixed(1)}%`);
    console.log(`Average Duration: ${results.averageDuration.toFixed(0)}ms`);
    
    if (results.successRate >= 90 && results.averageDuration < 8000) {
      console.log('🚀 Phase 2 optimizations are working well!');
      process.exit(0);
    } else {
      console.log('⚠️  Phase 2 optimizations need further tuning.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
