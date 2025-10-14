#!/usr/bin/env ts-node

/**
 * Test Validation Framework
 * Validates test results for tool selection, parameters, and results accuracy
 * 
 * Validation Types:
 * - Tool selection correctness
 * - Parameter accuracy
 * - Step dependency validation
 * - Response completeness
 * - Performance benchmarks
 * - Success rate by category
 * - Failure pattern analysis
 */

interface ValidationResult {
  scenarioId: string;
  category: string;
  subcategory: string;
  overallScore: number;
  validations: {
    toolSelection: {
      score: number;
      details: string;
      passed: boolean;
    };
    parameterAccuracy: {
      score: number;
      details: string;
      passed: boolean;
    };
    stepDependencies: {
      score: number;
      details: string;
      passed: boolean;
    };
    responseCompleteness: {
      score: number;
      details: string;
      passed: boolean;
    };
    performanceBenchmark: {
      score: number;
      details: string;
      passed: boolean;
    };
  };
  recommendations: string[];
}

interface ValidationSummary {
  totalValidated: number;
  averageScore: number;
  categoryScores: Record<string, number>;
  validationBreakdown: {
    toolSelection: { passed: number; failed: number; averageScore: number };
    parameterAccuracy: { passed: number; failed: number; averageScore: number };
    stepDependencies: { passed: number; failed: number; averageScore: number };
    responseCompleteness: { passed: number; failed: number; averageScore: number };
    performanceBenchmark: { passed: number; failed: number; averageScore: number };
  };
  topRecommendations: { recommendation: string; frequency: number }[];
}

// Validation functions
function validateToolSelection(scenario: any, plan: any): { score: number; details: string; passed: boolean } {
  if (!plan || !plan.steps) {
    return { score: 0, details: 'No plan or steps found', passed: false };
  }

  const usedTools = plan.steps.map((step: any) => step.tool);
  const expectedTools = scenario.expectedTools || [];
  const avoidedTools = scenario.avoidedTools || [];

  let score = 0;
  let details = '';
  let passed = true;

  // Check expected tools are present
  const expectedPresent = expectedTools.every(tool => usedTools.includes(tool));
  if (expectedPresent) {
    score += 40;
    details += '✓ Expected tools present. ';
  } else {
    const missing = expectedTools.filter(tool => !usedTools.includes(tool));
    details += `✗ Missing expected tools: ${missing.join(', ')}. `;
    passed = false;
  }

  // Check avoided tools are not present
  const avoidedAbsent = avoidedTools.every(tool => !usedTools.includes(tool));
  if (avoidedAbsent) {
    score += 30;
    details += '✓ Avoided tools not used. ';
  } else {
    const present = avoidedTools.filter(tool => usedTools.includes(tool));
    details += `✗ Avoided tools used: ${present.join(', ')}. `;
    passed = false;
  }

  // Check for smart tool selection (basic CRUD preferred)
  const hasBasicCrud = usedTools.some(tool => 
    ['facilities_list', 'facilities_get', 'shipments_list', 'shipments_get', 
     'contaminants_list', 'contaminants_get', 'inspections_list', 'inspections_get'].includes(tool)
  );
  if (hasBasicCrud) {
    score += 20;
    details += '✓ Uses basic CRUD tools. ';
  } else {
    details += '⚠ No basic CRUD tools detected. ';
  }

  // Check for relationship tool decomposition
  const relationshipTools = usedTools.filter(tool => 
    ['facilities_get_with_activity', 'shipments_get_with_contaminants', 
     'facilities_get_detailed', 'inspections_get_detailed', 'shipments_get_detailed'].includes(tool)
  );
  if (relationshipTools.length === 0) {
    score += 10;
    details += '✓ No complex relationship tools used. ';
  } else {
    details += `⚠ Complex relationship tools used: ${relationshipTools.join(', ')}. `;
  }

  return { score, details: details.trim(), passed };
}

function validateParameterAccuracy(scenario: any, plan: any): { score: number; details: string; passed: boolean } {
  if (!plan || !plan.steps || !scenario.expectedParams) {
    return { score: 100, details: 'No parameters to validate', passed: true };
  }

  let score = 0;
  let details = '';
  let passed = true;

  // Check if any step has the expected parameters
  const stepsWithParams = plan.steps.filter((step: any) => step.params);
  if (stepsWithParams.length === 0) {
    return { score: 0, details: 'No steps with parameters found', passed: false };
  }

  const paramMatches = stepsWithParams.map((step: any) => {
    const stepParams = step.params;
    const expectedParams = scenario.expectedParams;
    
    const matches = Object.entries(expectedParams).filter(([key, value]) => {
      return stepParams[key] === value;
    });

    return {
      stepId: step.stepId || 'unknown',
      matches: matches.length,
      total: Object.keys(expectedParams).length,
      ratio: matches.length / Object.keys(expectedParams).length
    };
  });

  const bestMatch = paramMatches.reduce((best, current) => 
    current.ratio > best.ratio ? current : best
  );

  score = Math.round(bestMatch.ratio * 100);
  
  if (bestMatch.ratio === 1) {
    details = '✓ All expected parameters found correctly';
    passed = true;
  } else if (bestMatch.ratio >= 0.8) {
    details = `✓ Most parameters correct (${bestMatch.matches}/${bestMatch.total})`;
    passed = true;
  } else if (bestMatch.ratio >= 0.5) {
    details = `⚠ Some parameters correct (${bestMatch.matches}/${bestMatch.total})`;
    passed = false;
  } else {
    details = `✗ Few parameters correct (${bestMatch.matches}/${bestMatch.total})`;
    passed = false;
  }

  return { score, details, passed };
}

function validateStepDependencies(plan: any): { score: number; details: string; passed: boolean } {
  if (!plan || !plan.steps) {
    return { score: 0, details: 'No plan or steps found', passed: false };
  }

  let score = 100;
  let details = '';
  let passed = true;

  // Check for circular dependencies
  const steps = plan.steps;
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(stepIndex: number): boolean {
    if (recursionStack.has(stepIndex)) return true;
    if (visited.has(stepIndex)) return false;

    visited.add(stepIndex);
    recursionStack.add(stepIndex);

    const step = steps[stepIndex];
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        const depIndex = steps.findIndex((s: any) => s.stepId === dep);
        if (depIndex !== -1 && hasCycle(depIndex)) return true;
      }
    }

    recursionStack.delete(stepIndex);
    return false;
  }

  // Check for cycles
  for (let i = 0; i < steps.length; i++) {
    if (hasCycle(i)) {
      score -= 50;
      details += '✗ Circular dependency detected. ';
      passed = false;
    }
  }

  // Check for valid dependencies
  const invalidDeps = [];
  for (const step of steps) {
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        const depExists = steps.some((s: any) => s.stepId === dep);
        if (!depExists) {
          invalidDeps.push(`${step.stepId} depends on non-existent ${dep}`);
        }
      }
    }
  }

  if (invalidDeps.length > 0) {
    score -= 30;
    details += `✗ Invalid dependencies: ${invalidDeps.join(', ')}. `;
    passed = false;
  } else {
    details += '✓ Dependencies are valid. ';
  }

  // Check for parallel execution opportunities
  const parallelSteps = steps.filter((step: any) => step.parallel === true);
  if (parallelSteps.length > 0) {
    details += `✓ ${parallelSteps.length} steps marked for parallel execution. `;
  }

  return { score: Math.max(0, score), details: details.trim(), passed };
}

function validateResponseCompleteness(execution: any, analysis: any): { score: number; details: string; passed: boolean } {
  let score = 0;
  let details = '';
  let passed = true;

  // Check execution results
  if (!execution || !execution.results) {
    return { score: 0, details: 'No execution results found', passed: false };
  }

  const results = execution.results;
  const successfulSteps = results.filter((r: any) => r.success);
  const failedSteps = results.filter((r: any) => !r.success);

  // Execution completeness
  if (results.length > 0) {
    const successRate = successfulSteps.length / results.length;
    score += Math.round(successRate * 50);
    
    if (successRate === 1) {
      details += '✓ All execution steps successful. ';
    } else if (successRate >= 0.8) {
      details += `✓ Most execution steps successful (${successfulSteps.length}/${results.length}). `;
    } else {
      details += `✗ Many execution steps failed (${failedSteps.length}/${results.length}). `;
      passed = false;
    }
  }

  // Analysis completeness
  if (!analysis || !analysis.analysis) {
    score -= 30;
    details += '✗ No analysis results found. ';
    passed = false;
  } else {
    const analysisData = analysis.analysis;
    score += 30;
    
    if (analysisData.summary && analysisData.summary.length > 10) {
      score += 10;
      details += '✓ Analysis summary present. ';
    } else {
      details += '⚠ Analysis summary missing or too short. ';
    }

    if (analysisData.insights && analysisData.insights.length > 0) {
      score += 10;
      details += '✓ Analysis insights present. ';
    } else {
      details += '⚠ Analysis insights missing. ';
    }
  }

  return { score: Math.min(100, Math.max(0, score)), details: details.trim(), passed };
}

function validatePerformanceBenchmark(result: any): { score: number; details: string; passed: boolean } {
  if (!result.performanceMetrics) {
    return { score: 50, details: 'No performance metrics available', passed: true };
  }

  const metrics = result.performanceMetrics;
  let score = 100;
  let details = '';
  let passed = true;

  // Plan generation time (target: < 2s)
  if (metrics.planGenerationTime > 2000) {
    score -= 20;
    details += `⚠ Plan generation slow: ${metrics.planGenerationTime.toFixed(0)}ms. `;
    passed = false;
  } else {
    details += `✓ Plan generation fast: ${metrics.planGenerationTime.toFixed(0)}ms. `;
  }

  // Tool execution time (target: < 10s)
  if (metrics.toolExecutionTime > 10000) {
    score -= 30;
    details += `⚠ Tool execution slow: ${metrics.toolExecutionTime.toFixed(0)}ms. `;
    passed = false;
  } else {
    details += `✓ Tool execution fast: ${metrics.toolExecutionTime.toFixed(0)}ms. `;
  }

  // Analysis time (target: < 5s)
  if (metrics.analysisTime > 5000) {
    score -= 20;
    details += `⚠ Analysis slow: ${metrics.analysisTime.toFixed(0)}ms. `;
    passed = false;
  } else {
    details += `✓ Analysis fast: ${metrics.analysisTime.toFixed(0)}ms. `;
  }

  // Total time (target: < 20s)
  if (metrics.totalTime > 20000) {
    score -= 30;
    details += `⚠ Total execution slow: ${metrics.totalTime.toFixed(0)}ms. `;
    passed = false;
  } else {
    details += `✓ Total execution fast: ${metrics.totalTime.toFixed(0)}ms. `;
  }

  return { score: Math.max(0, score), details: details.trim(), passed };
}

// Main validation function
function validateTestResult(scenario: any, result: any): ValidationResult {
  const toolSelection = validateToolSelection(scenario, result.plan);
  const parameterAccuracy = validateParameterAccuracy(scenario, result.plan);
  const stepDependencies = validateStepDependencies(result.plan);
  const responseCompleteness = validateResponseCompleteness(result.execution, result.analysis);
  const performanceBenchmark = validatePerformanceBenchmark(result);

  const overallScore = Math.round((
    toolSelection.score + 
    parameterAccuracy.score + 
    stepDependencies.score + 
    responseCompleteness.score + 
    performanceBenchmark.score
  ) / 5);

  const recommendations = [];
  if (toolSelection.score < 80) recommendations.push('Improve tool selection logic');
  if (parameterAccuracy.score < 80) recommendations.push('Enhance parameter inference');
  if (stepDependencies.score < 80) recommendations.push('Fix step dependency issues');
  if (responseCompleteness.score < 80) recommendations.push('Ensure complete responses');
  if (performanceBenchmark.score < 80) recommendations.push('Optimize performance');

  return {
    scenarioId: scenario.id,
    category: scenario.category,
    subcategory: scenario.subcategory,
    overallScore,
    validations: {
      toolSelection,
      parameterAccuracy,
      stepDependencies,
      responseCompleteness,
      performanceBenchmark
    },
    recommendations
  };
}

// Validation summary generation
function generateValidationSummary(validations: ValidationResult[]): ValidationSummary {
  const totalValidated = validations.length;
  const averageScore = validations.reduce((sum, v) => sum + v.overallScore, 0) / totalValidated;

  // Category scores
  const categoryScores: Record<string, number> = {};
  const categoryGroups = validations.reduce((groups, v) => {
    if (!groups[v.category]) groups[v.category] = [];
    groups[v.category].push(v.overallScore);
    return groups;
  }, {} as Record<string, number[]>);

  Object.entries(categoryGroups).forEach(([category, scores]) => {
    categoryScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  // Validation breakdown
  const validationBreakdown = {
    toolSelection: { passed: 0, failed: 0, averageScore: 0 },
    parameterAccuracy: { passed: 0, failed: 0, averageScore: 0 },
    stepDependencies: { passed: 0, failed: 0, averageScore: 0 },
    responseCompleteness: { passed: 0, failed: 0, averageScore: 0 },
    performanceBenchmark: { passed: 0, failed: 0, averageScore: 0 }
  };

  Object.keys(validationBreakdown).forEach(key => {
    const validationKey = key as keyof typeof validationBreakdown;
    const scores = validations.map(v => v.validations[validationKey].score);
    const passed = validations.filter(v => v.validations[validationKey].passed).length;
    
    validationBreakdown[validationKey] = {
      passed,
      failed: totalValidated - passed,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
    };
  });

  // Top recommendations
  const allRecommendations = validations.flatMap(v => v.recommendations);
  const recommendationCounts = allRecommendations.reduce((counts, rec) => {
    counts[rec] = (counts[rec] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const topRecommendations = Object.entries(recommendationCounts)
    .map(([recommendation, frequency]) => ({ recommendation, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  return {
    totalValidated,
    averageScore,
    categoryScores,
    validationBreakdown,
    topRecommendations
  };
}

// Export functions
export {
  validateTestResult,
  generateValidationSummary,
  validateToolSelection,
  validateParameterAccuracy,
  validateStepDependencies,
  validateResponseCompleteness,
  validatePerformanceBenchmark
};

// CLI interface
if (require.main === module) {
  const fs = require('fs');
  
  try {
    const resultsData = JSON.parse(fs.readFileSync('comprehensive-test-results.json', 'utf8'));
    const scenarios = resultsData.results.map((r: any) => ({
      id: r.scenarioId,
      category: r.category,
      subcategory: r.subcategory,
      expectedTools: r.expectedTools || [],
      expectedParams: r.expectedParams || {},
      avoidedTools: r.avoidedTools || []
    }));
    
    const results = resultsData.results;
    
    console.log('🔍 Validating test results...');
    
    const validations = results.map((result: any, index: number) => {
      const scenario = scenarios[index];
      return validateTestResult(scenario, result);
    });
    
    const summary = generateValidationSummary(validations);
    
    console.log('\n📊 Validation Summary:');
    console.log(`  Total Validated: ${summary.totalValidated}`);
    console.log(`  Average Score: ${summary.averageScore.toFixed(1)}%`);
    
    console.log('\n📈 Category Scores:');
    Object.entries(summary.categoryScores).forEach(([category, score]) => {
      console.log(`  ${category}: ${score.toFixed(1)}%`);
    });
    
    console.log('\n✅ Validation Breakdown:');
    Object.entries(summary.validationBreakdown).forEach(([validation, data]) => {
      console.log(`  ${validation}: ${data.passed}/${summary.totalValidated} passed (${data.averageScore.toFixed(1)}% avg)`);
    });
    
    if (summary.topRecommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      summary.topRecommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.recommendation} (${rec.frequency} times)`);
      });
    }
    
    // Save validation results
    const validationReport = {
      metadata: {
        generated_at: new Date().toISOString(),
        summary
      },
      validations
    };
    
    fs.writeFileSync('validation-results.json', JSON.stringify(validationReport, null, 2));
    console.log('\n📄 Validation results saved to validation-results.json');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}
