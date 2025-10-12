#!/usr/bin/env node

/**
 * Production Memory System Verification Script
 * Tests Wasteer API, GraphQL endpoint, and Pinecone memory system
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const WASTEER_API_URL = process.env.WASTEER_API_URL_PROD || 'https://wasteer-api-production.up.railway.app/api';
const GRAPHQL_URL = process.env.GRAPHQL_DEPLOYED_URL || process.env.GRAPHQL_URL_PROD || '';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME || 'clear-ai';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
  details?: any;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️ ';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  console.log(`${icon} ${result.name}${duration}`);
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
  }
  results.push(result);
}

async function testWasteerAPI() {
  console.log('\n🔍 Testing Wasteer API...\n');

  // Test 1: Health check
  try {
    const start = Date.now();
    const response = await axios.get(`${WASTEER_API_URL.replace('/api', '')}/health`, {
      timeout: 10000,
    });
    const duration = Date.now() - start;

    if (response.data.success) {
      logTest({
        name: 'Wasteer API Health Check',
        status: 'pass',
        message: 'API is running',
        duration,
      });
    } else {
      logTest({
        name: 'Wasteer API Health Check',
        status: 'fail',
        message: 'API returned unexpected response',
        details: response.data,
      });
    }
  } catch (error: any) {
    logTest({
      name: 'Wasteer API Health Check',
      status: 'fail',
      message: `Failed to connect: ${error.message}`,
    });
  }

  // Test 2: Data counts
  try {
    const start = Date.now();
    const [shipments, facilities, contaminants, inspections] = await Promise.all([
      axios.get(`${WASTEER_API_URL}/shipments`),
      axios.get(`${WASTEER_API_URL}/facilities`),
      axios.get(`${WASTEER_API_URL}/contaminants`),
      axios.get(`${WASTEER_API_URL}/inspections`),
    ]);
    const duration = Date.now() - start;

    const counts = {
      shipments: shipments.data.count,
      facilities: facilities.data.count,
      contaminants: contaminants.data.count,
      inspections: inspections.data.count,
    };

    const isExpanded = counts.shipments >= 100 && counts.facilities >= 20;

    logTest({
      name: 'Wasteer API Data Counts',
      status: isExpanded ? 'pass' : 'fail',
      message: isExpanded
        ? 'Expanded seed data detected'
        : 'Old seed data detected - needs reseed after redeploy',
      duration,
      details: counts,
    });
  } catch (error: any) {
    logTest({
      name: 'Wasteer API Data Counts',
      status: 'fail',
      message: `Failed to fetch data: ${error.message}`,
    });
  }
}

async function testGraphQLEndpoint() {
  console.log('\n🔍 Testing GraphQL Endpoint...\n');

  if (!GRAPHQL_URL) {
    logTest({
      name: 'GraphQL Endpoint Check',
      status: 'skip',
      message: 'GRAPHQL_URL not configured - set GRAPHQL_DEPLOYED_URL in .env',
    });
    return;
  }

  // Test 1: Health check
  try {
    const start = Date.now();
    await axios.get(`${GRAPHQL_URL.replace('/graphql', '')}/health`, {
      timeout: 10000,
    });
    const duration = Date.now() - start;

    logTest({
      name: 'GraphQL Health Check',
      status: 'pass',
      message: 'GraphQL server is running',
      duration,
    });
  } catch (error: any) {
    logTest({
      name: 'GraphQL Health Check',
      status: 'fail',
      message: `Failed to connect: ${error.message}`,
    });
    return; // Skip further tests if can't connect
  }

  // Test 2: Execute a test query
  try {
    const start = Date.now();
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: `
          mutation {
            executeQuery(query: "Show me all facilities") {
              message
              toolsUsed
            }
          }
        `,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    const duration = Date.now() - start;

    if (response.data.errors) {
      logTest({
        name: 'GraphQL Query Execution',
        status: 'fail',
        message: 'Query returned errors',
        details: response.data.errors,
      });
    } else if (response.data.data?.executeQuery) {
      const result = response.data.data.executeQuery;
      logTest({
        name: 'GraphQL Query Execution',
        status: 'pass',
        message: 'Query executed successfully',
        duration,
        details: {
          toolsUsed: result.toolsUsed,
          messageLength: result.message.length,
        },
      });
    } else {
      logTest({
        name: 'GraphQL Query Execution',
        status: 'fail',
        message: 'Unexpected response structure',
        details: response.data,
      });
    }
  } catch (error: any) {
    logTest({
      name: 'GraphQL Query Execution',
      status: 'fail',
      message: `Query failed: ${error.message}`,
    });
  }
}

async function testPineconeIntegration() {
  console.log('\n🔍 Testing Pinecone Integration...\n');

  if (!PINECONE_API_KEY) {
    logTest({
      name: 'Pinecone Stats',
      status: 'skip',
      message: 'PINECONE_API_KEY not available',
    });
    return;
  }

  // Test: Get index stats
  try {
    const start = Date.now();
    const res = await axios.post(
      `https://api.pinecone.io/describe_index_stats`,
      {},
      {
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'X-Pinecone-API-Version': '2024-10',
        },
        timeout: 10000,
      }
    );
    const duration = Date.now() - start;

    const stats = res.data;
    const vectorCount = stats.totalRecordCount || stats.totalVectorCount || 0;

    logTest({
      name: 'Pinecone Index Stats',
      status: vectorCount > 0 ? 'pass' : 'fail',
      message: vectorCount > 0
        ? `Index has ${vectorCount} vectors - memory is being stored!`
        : 'Index has 0 vectors - no memories stored yet',
      duration,
      details: stats,
    });
  } catch (error: any) {
    logTest({
      name: 'Pinecone Index Stats',
      status: 'fail',
      message: `Failed to get stats: ${error.message}`,
    });
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  const successRate = total > 0 ? ((passed / (total - skipped)) * 100).toFixed(0) : 0;
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (failed === 0 && passed > 0) {
    console.log('\n🎉 All tests passed! Production is ready!');
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check details above.');
    console.log('\n💡 Common fixes:');
    console.log('   - Add MEMORY_EMBEDDING_PROVIDER=openai to Railway');
    console.log('   - Redeploy Wasteer API for new seed data');
    console.log('   - Verify all environment variables are set');
    console.log('   - Check Railway logs for errors');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 Clear AI v2 - Production Verification\n');
  console.log(`Wasteer API: ${WASTEER_API_URL}`);
  console.log(`GraphQL URL: ${GRAPHQL_URL || 'Not configured'}`);
  console.log(`Pinecone Index: ${PINECONE_INDEX}`);
  console.log('');

  try {
    await testWasteerAPI();
    await testGraphQLEndpoint();
    await testPineconeIntegration();
    await printSummary();

    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'fail').length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Verification script failed:', error.message);
    process.exit(1);
  }
}

main();

