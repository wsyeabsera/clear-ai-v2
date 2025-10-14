#!/usr/bin/env ts-node

import axios from 'axios';

async function debugTest() {
  const baseUrl = 'http://localhost:4001/graphql';
  
  console.log('🔍 Debug test - checking each step individually...');
  
  try {
    // Step 1: Plan
    console.log('📋 Step 1: Planning...');
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
    console.log('🔧 Step 2: Executing...');
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
    
    // Step 3: Analyze (this is where the error occurs)
    console.log('🔍 Step 3: Analyzing...');
    try {
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
      
    } catch (analysisError: any) {
      console.error('❌ Analysis failed:', analysisError.message);
      if (analysisError.response?.data) {
        console.error('Response:', JSON.stringify(analysisError.response.data, null, 2));
      }
      return;
    }
    
    console.log('🎉 All steps completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugTest().catch(console.error);
