#!/usr/bin/env ts-node

import axios from 'axios';
import { performance } from 'perf_hooks';

interface TestResult {
  scenario: string;
  query: string;
  responseTime: number;
  success: boolean;
  response?: any;
  error?: string;
  reasoningTrace?: any[];
  validationResult?: any;
  insights?: any[];
  summary?: string;
}

class EnhancedAgentTester {
  private baseUrl = 'http://localhost:4001/graphql';
  private results: TestResult[] = [];

  async runTest(scenario: string, query: string): Promise<TestResult> {
    console.log(`\n🧪 Testing: ${scenario}`);
    console.log(`📝 Query: "${query}"`);
    
    const startTime = performance.now();
    
    try {
      // Step 1: Plan the query
      console.log(`   📋 Planning query...`);
      const planResponse = await axios.post(this.baseUrl, {
        query: `
          mutation PlanQuery($query: String!) {
            planQuery(query: $query) {
              requestId
              plan {
                steps {
                  tool
                  params
                  dependsOn
                  parallel
                }
              }
              metadata {
                query
                timestamp
                estimatedDurationMs
              }
              status
            }
          }
        `,
        variables: { query }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const requestId = planResponse.data?.data?.planQuery?.requestId;
      if (!requestId) {
        throw new Error('Failed to get request ID from planning');
      }

      console.log(`   ✅ Plan created (ID: ${requestId})`);

      // Step 2: Execute tools
      console.log(`   🔧 Executing tools...`);
      const executionResponse = await axios.post(this.baseUrl, {
        query: `
          mutation ExecuteTools($requestId: ID!) {
            executeTools(requestId: $requestId) {
              requestId
              results {
                success
                tool
                data
                error {
                  code
                  message
                  details
                }
                metadata {
                  executionTime
                  timestamp
                  retries
                }
              }
              metadata {
                totalDurationMs
                successfulSteps
                failedSteps
                timestamp
              }
            }
          }
        `,
        variables: { requestId }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      console.log(`   ✅ Tools executed`);

      // Step 3: Analyze results
      console.log(`   🔍 Analyzing results...`);
      const analysisResponse = await axios.post(this.baseUrl, {
        query: `
          mutation AnalyzeResults($requestId: ID!) {
            analyzeResults(requestId: $requestId) {
              requestId
              analysis {
                summary
                insights {
                  type
                  description
                  confidence
                  supportingData
                }
                entities {
                  id
                  type
                  name
                  attributes
                  relationships {
                    type
                    targetEntityId
                    strength
                  }
                }
                anomalies {
                  type
                  description
                  severity
                  affectedEntities
                  data
                }
                metadata {
                  toolResultsCount
                  successfulResults
                  failedResults
                  analysisTimeMs
                }
              }
              metadata {
                toolResultsCount
                successfulResults
                failedResults
                analysisTimeMs
              }
            }
          }
        `,
        variables: { requestId }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      console.log(`   ✅ Analysis complete`);

      // Step 4: Summarize response
      console.log(`   📝 Summarizing response...`);
      const summaryResponse = await axios.post(this.baseUrl, {
        query: `
          mutation SummarizeResponse($requestId: ID!) {
            summarizeResponse(requestId: $requestId) {
              requestId
              message
              toolsUsed
              metadata {
                requestId
                totalDurationMs
                timestamp
                error
              }
            }
          }
        `,
        variables: { requestId }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const analysis = analysisResponse.data?.data?.analyzeResults?.analysis;
      const summary = summaryResponse.data?.data?.summarizeResponse;

      const result: TestResult = {
        scenario,
        query,
        responseTime,
        success: true,
        response: {
          requestId,
          plan: planResponse.data?.data?.planQuery,
          execution: executionResponse.data?.data?.executeTools,
          analysis: analysisResponse.data?.data?.analyzeResults,
          summary: summaryResponse.data?.data?.summarizeResponse
        },
        reasoningTrace: analysis?.metadata?.reasoning_trace,
        validationResult: analysis?.metadata?.validation_result,
        insights: analysis?.insights,
        summary: summary?.message
      };

      this.results.push(result);
      this.logResult(result);
      return result;

    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result: TestResult = {
        scenario,
        query,
        responseTime,
        success: false,
        error: error.message || 'Unknown error'
      };

      this.results.push(result);
      this.logResult(result);
      return result;
    }
  }

  private logResult(result: TestResult): void {
    console.log(`⏱️  Response time: ${result.responseTime.toFixed(2)}ms`);
    
    if (result.success) {
      console.log(`✅ Success: Query processed successfully`);
      console.log(`📊 Request ID: ${result.response?.requestId}`);
      
      // Log plan details
      if (result.response?.plan) {
        const plan = result.response.plan;
        console.log(`📋 Plan Steps: ${plan.plan?.steps?.length || 0}`);
        if (plan.plan?.steps) {
          plan.plan.steps.forEach((step: any, index: number) => {
            console.log(`   ${index + 1}. ${step.tool}: ${JSON.stringify(step.params)}`);
          });
        }
      }

      // Log execution results
      if (result.response?.execution) {
        const exec = result.response.execution;
        console.log(`🔧 Execution: ${exec.metadata?.successfulSteps || 0}/${exec.metadata?.successfulSteps + exec.metadata?.failedSteps || 0} successful`);
        console.log(`   Duration: ${exec.metadata?.totalDurationMs}ms`);
      }

      // Log reasoning trace if present
      if (result.reasoningTrace && result.reasoningTrace.length > 0) {
        console.log(`🧠 Reasoning Steps: ${result.reasoningTrace.length}`);
        result.reasoningTrace.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step.reasoning_type}: ${step.description}`);
          if (step.confidence) {
            console.log(`      Confidence: ${(step.confidence * 100).toFixed(1)}%`);
          }
        });
      }

      // Log validation result if present
      if (result.validationResult) {
        console.log(`🔍 Validation: ${result.validationResult.is_valid ? 'PASSED' : 'FAILED'}`);
        console.log(`   Quality Score: ${(result.validationResult.quality_score * 100).toFixed(1)}%`);
        if (result.validationResult.issues && result.validationResult.issues.length > 0) {
          console.log(`   Issues: ${result.validationResult.issues.length}`);
          result.validationResult.issues.forEach((issue: any) => {
            console.log(`     - ${issue.type} (${issue.severity}): ${issue.description}`);
          });
        }
      }

      // Log insights if present
      if (result.insights && result.insights.length > 0) {
        console.log(`💡 Insights: ${result.insights.length}`);
        result.insights.forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight.type}: ${insight.description}`);
          if (insight.confidence) {
            console.log(`      Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
          }
        });
      }

      // Log analysis summary
      if (result.response?.analysis?.analysis) {
        const analysis = result.response.analysis.analysis;
        console.log(`🔍 Analysis Summary: ${analysis.summary?.substring(0, 150)}${analysis.summary?.length > 150 ? '...' : ''}`);
        console.log(`   Entities: ${analysis.entities?.length || 0}`);
        console.log(`   Anomalies: ${analysis.anomalies?.length || 0}`);
      }

      // Log final summary
      if (result.summary) {
        console.log(`📋 Final Summary: ${result.summary.substring(0, 200)}${result.summary.length > 200 ? '...' : ''}`);
      }

      // Log tools used
      if (result.response?.summary?.toolsUsed) {
        console.log(`🛠️  Tools Used: ${result.response.summary.toolsUsed.join(', ')}`);
      }

    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Enhanced Agent Tests');
    console.log('================================');

    // Test 1: Contamination Analysis (Analyzer Focus)
    await this.runTest(
      'Contamination Analysis',
      'Show me all critical contaminants and their risk levels'
    );

    // Test 2: Facility Capacity Analysis (Analyzer Focus)
    await this.runTest(
      'Facility Capacity Analysis',
      'Which facilities are over 90% capacity?'
    );

    // Test 3: Complex Multi-Entity Query (Both Agents)
    await this.runTest(
      'Multi-Entity Analysis',
      'Show me contaminated shipments and their facility destinations with risk assessment'
    );

    // Test 4: Summary Quality (Summarizer Focus)
    await this.runTest(
      'Status Summary',
      'Summarize the current waste management status'
    );

    await this.generateReport();
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 TEST SUMMARY REPORT');
    console.log('=====================');

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;

    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests}`);
    console.log(`   Failed: ${totalTests - successfulTests}`);
    console.log(`   Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    console.log(`\n🧠 Chain-of-Thought Analysis:`);
    const testsWithReasoning = this.results.filter(r => r.reasoningTrace && r.reasoningTrace.length > 0);
    console.log(`   Tests with Reasoning: ${testsWithReasoning.length}/${totalTests}`);
    
    testsWithReasoning.forEach(result => {
      const avgConfidence = result.reasoningTrace!.reduce((sum, step) => sum + (step.confidence || 0), 0) / result.reasoningTrace!.length;
      console.log(`   ${result.scenario}: ${result.reasoningTrace!.length} steps, avg confidence ${(avgConfidence * 100).toFixed(1)}%`);
    });

    console.log(`\n🔍 Self-Critique Analysis:`);
    const testsWithValidation = this.results.filter(r => r.validationResult);
    console.log(`   Tests with Validation: ${testsWithValidation.length}/${totalTests}`);
    
    testsWithValidation.forEach(result => {
      const validation = result.validationResult!;
      console.log(`   ${result.scenario}: ${validation.is_valid ? 'PASSED' : 'FAILED'} (${(validation.quality_score * 100).toFixed(1)}% quality)`);
    });

    console.log(`\n💡 Insights Generated:`);
    const testsWithInsights = this.results.filter(r => r.insights && r.insights.length > 0);
    console.log(`   Tests with Insights: ${testsWithInsights.length}/${totalTests}`);
    
    testsWithInsights.forEach(result => {
      const avgInsightConfidence = result.insights!.reduce((sum, insight) => sum + (insight.confidence || 0), 0) / result.insights!.length;
      console.log(`   ${result.scenario}: ${result.insights!.length} insights, avg confidence ${(avgInsightConfidence * 100).toFixed(1)}%`);
    });

    console.log(`\n📋 Summary Quality:`);
    const testsWithSummary = this.results.filter(r => r.summary && r.summary.length > 0);
    console.log(`   Tests with Summary: ${testsWithSummary.length}/${totalTests}`);
    
    testsWithSummary.forEach(result => {
      console.log(`   ${result.scenario}: ${result.summary!.length} characters`);
    });

    // Save detailed results to file
    const fs = await import('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        successfulTests,
        successRate: (successfulTests / totalTests) * 100,
        averageResponseTime: avgResponseTime
      },
      results: this.results
    };

    fs.writeFileSync('enhanced-agent-test-results.json', JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed results saved to: enhanced-agent-test-results.json`);
  }
}

// Run the tests
async function main() {
  const tester = new EnhancedAgentTester();
  await tester.runAllTests();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EnhancedAgentTester };
