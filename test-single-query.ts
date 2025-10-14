#!/usr/bin/env ts-node

import axios from 'axios';

async function testSingleQuery() {
  const baseUrl = 'http://localhost:4001/graphql';
  
  console.log('🧪 Testing single contamination query...');
  
  try {
    // Step 1: Plan
    const planResponse = await axios.post(baseUrl, {
      query: `
        mutation PlanQuery($query: String!) {
          planQuery(query: $query) {
            requestId
            plan { steps { tool params } }
            status
          }
        }
      `,
      variables: { query: "Show me all critical contaminants and their risk levels" }
    });
    
    const requestId = planResponse.data?.data?.planQuery?.requestId;
    console.log(`✅ Plan created: ${requestId}`);
    
    // Step 2: Execute
    const execResponse = await axios.post(baseUrl, {
      query: `
        mutation ExecuteTools($requestId: ID!) {
          executeTools(requestId: $requestId) {
            requestId
            results { success tool data }
            metadata { successfulSteps failedSteps totalDurationMs }
          }
        }
      `,
      variables: { requestId }
    });
    
    console.log(`✅ Execution: ${execResponse.data?.data?.executeTools?.metadata?.successfulSteps} successful`);
    
    // Step 3: Analyze
    const analysisResponse = await axios.post(baseUrl, {
      query: `
        mutation AnalyzeResults($requestId: ID!) {
          analyzeResults(requestId: $requestId) {
            requestId
            analysis {
              summary
              insights { type description confidence }
              metadata { analysisTimeMs }
            }
          }
        }
      `,
      variables: { requestId }
    });
    
    const analysis = analysisResponse.data?.data?.analyzeResults?.analysis;
    console.log(`✅ Analysis complete: ${analysis?.insights?.length || 0} insights`);
    console.log(`📊 Summary: ${analysis?.summary?.substring(0, 100)}...`);
    
    // Step 4: Summarize
    const summaryResponse = await axios.post(baseUrl, {
      query: `
        mutation SummarizeResponse($requestId: ID!) {
          summarizeResponse(requestId: $requestId) {
            requestId
            message
            toolsUsed
          }
        }
      `,
      variables: { requestId }
    });
    
    const summary = summaryResponse.data?.data?.summarizeResponse;
    console.log(`✅ Summary: ${summary?.message?.substring(0, 100)}...`);
    console.log(`🛠️  Tools: ${summary?.toolsUsed?.join(', ')}`);
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSingleQuery().catch(console.error);
