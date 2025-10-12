#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests deployed GraphQL endpoint to ensure it's working correctly
 * 
 * Usage:
 *   node dist/scripts/verify-deployment.js <endpoint>
 *   node dist/scripts/verify-deployment.js https://your-app.railway.app/graphql
 */

import { GraphQLClient } from 'graphql-request';

async function verifyDeployment(endpoint: string) {
  console.log('\n🔍 Verifying deployment at:', endpoint);
  console.log('━'.repeat(60));

  try {
    // 1. Health Check
    console.log('\n1️⃣  Testing health endpoint...');
    const healthUrl = endpoint.replace('/graphql', '/health');
    const healthResponse = await fetch(healthUrl);

    if (!healthResponse.ok) {
      throw new Error(`Health check failed with status: ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log('   ✅ Health check passed:', healthData);

    // 2. GraphQL Server Check
    console.log('\n2️⃣  Testing GraphQL endpoint...');
    const client = new GraphQLClient(endpoint);

    const testQuery = `
      mutation TestQuery {
        executeQuery(query: "List all shipments") {
          requestId
          message
          toolsUsed
          metadata {
            requestId
            totalDurationMs
            timestamp
          }
        }
      }
    `;

    const result = await client.request(testQuery);
    console.log('   ✅ GraphQL query successful!');
    console.log('   Request ID:', (result as any).executeQuery.requestId);
    console.log('   Tools Used:', (result as any).executeQuery.toolsUsed);
    console.log('   Duration:', (result as any).executeQuery.metadata.totalDurationMs + 'ms');

    // 3. Summary
    console.log('\n' + '━'.repeat(60));
    console.log('✅ Deployment verification PASSED!');
    console.log('\nDeployment is fully operational and ready to use.');
    console.log('━'.repeat(60) + '\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n' + '━'.repeat(60));
    console.error('❌ Deployment verification FAILED!');
    console.error('\nError:', error.message);

    if (error.response) {
      console.error('\nGraphQL Response:', JSON.stringify(error.response, null, 2));
    }

    console.error('━'.repeat(60) + '\n');
    process.exit(1);
  }
}

// Get endpoint from command line args or environment variable
const endpoint = process.argv[2] || 
  process.env.GRAPHQL_ENDPOINT || 
  process.env.STAGING_URL ||
  'http://localhost:4001/graphql';

verifyDeployment(endpoint);

