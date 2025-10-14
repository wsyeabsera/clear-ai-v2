# Blueprint 05: Analyzer Improvements

## 🎯 Problem Statement

**Current Issue:** Analyzer provides basic summaries but lacks actionable insights and root cause analysis.

**Root Cause:** 
- No pattern recognition in results
- No actionable recommendations
- No root cause analysis
- No predictive insights

**Impact:** Medium - Reduces the value of execution results and limits learning.

## 🏗️ Proposed Solution

### New Architecture
```
Execution Results → Pattern Recognition → Root Cause Analysis → Actionable Insights → Predictive Analytics → Enhanced Analysis
```

### Core Components

#### 1. Pattern Recognition Engine
```typescript
class PatternRecognitionEngine {
  identifyPatterns(results: ToolResult[]): Pattern[] {
    // Identify common patterns in execution results
    // Detect anomalies and trends
    // Find correlation between steps
  }
}
```

#### 2. Root Cause Analyzer
```typescript
class RootCauseAnalyzer {
  analyzeFailures(results: ToolResult[]): RootCauseAnalysis[] {
    // Analyze failure patterns
    // Identify root causes
    // Suggest preventive measures
  }
}
```

#### 3. Insight Generator
```typescript
class InsightGenerator {
  generateInsights(results: ToolResult[], patterns: Pattern[]): Insight[] {
    // Generate actionable insights
    // Provide recommendations
    // Suggest optimizations
  }
}
```

## 📝 Implementation Steps

### Step 1: Create Pattern Recognition Engine
```typescript
// src/agents/analyzer/pattern-recognition-engine.ts
export interface Pattern {
  type: 'SUCCESS_PATTERN' | 'FAILURE_PATTERN' | 'PERFORMANCE_PATTERN' | 'CORRELATION_PATTERN';
  description: string;
  confidence: number;
  examples: ToolResult[];
  metadata: any;
}

export class PatternRecognitionEngine {
  identifyPatterns(results: ToolResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Identify success patterns
    patterns.push(...this.identifySuccessPatterns(results));
    
    // Identify failure patterns
    patterns.push(...this.identifyFailurePatterns(results));
    
    // Identify performance patterns
    patterns.push(...this.identifyPerformancePatterns(results));
    
    // Identify correlation patterns
    patterns.push(...this.identifyCorrelationPatterns(results));
    
    return patterns.filter(p => p.confidence > 0.7);
  }
  
  private identifySuccessPatterns(results: ToolResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    const successfulSteps = results.filter(r => r.success);
    
    // Pattern: Sequential success
    if (successfulSteps.length === results.length) {
      patterns.push({
        type: 'SUCCESS_PATTERN',
        description: 'All steps executed successfully in sequence',
        confidence: 1.0,
        examples: successfulSteps,
        metadata: {
          successRate: 1.0,
          totalSteps: results.length
        }
      });
    }
    
    // Pattern: Fast execution
    const avgExecutionTime = successfulSteps.reduce((sum, r) => sum + (r.metadata.executionTime || 0), 0) / successfulSteps.length;
    if (avgExecutionTime < 1000) { // Less than 1 second
      patterns.push({
        type: 'SUCCESS_PATTERN',
        description: 'Fast execution with average time under 1 second',
        confidence: 0.9,
        examples: successfulSteps,
        metadata: {
          averageExecutionTime: avgExecutionTime,
          fastSteps: successfulSteps.filter(r => (r.metadata.executionTime || 0) < 1000).length
        }
      });
    }
    
    return patterns;
  }
  
  private identifyFailurePatterns(results: ToolResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    const failedSteps = results.filter(r => !r.success);
    
    if (failedSteps.length === 0) return patterns;
    
    // Pattern: Cascade failures
    const cascadeFailures = this.detectCascadeFailures(results);
    if (cascadeFailures.length > 0) {
      patterns.push({
        type: 'FAILURE_PATTERN',
        description: 'Cascade failure pattern detected',
        confidence: 0.9,
        examples: cascadeFailures,
        metadata: {
          cascadeLength: cascadeFailures.length,
          firstFailureIndex: cascadeFailures[0].metadata?.stepIndex || 0
        }
      });
    }
    
    // Pattern: Common error types
    const errorTypes = this.groupErrorsByType(failedSteps);
    for (const [errorType, steps] of Object.entries(errorTypes)) {
      if (steps.length > 1) {
        patterns.push({
          type: 'FAILURE_PATTERN',
          description: `Multiple failures of type: ${errorType}`,
          confidence: 0.8,
          examples: steps,
          metadata: {
            errorType,
            frequency: steps.length,
            percentage: (steps.length / failedSteps.length) * 100
          }
        });
      }
    }
    
    return patterns;
  }
  
  private identifyPerformancePatterns(results: ToolResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    const executionTimes = results.map(r => r.metadata.executionTime || 0);
    
    // Pattern: Performance degradation
    const isDegrading = this.detectPerformanceDegradation(executionTimes);
    if (isDegrading) {
      patterns.push({
        type: 'PERFORMANCE_PATTERN',
        description: 'Performance degradation detected over time',
        confidence: 0.8,
        examples: results,
        metadata: {
          trend: 'degrading',
          startTime: executionTimes[0],
          endTime: executionTimes[executionTimes.length - 1],
          degradationRate: this.calculateDegradationRate(executionTimes)
        }
      });
    }
    
    // Pattern: Slow operations
    const slowOperations = results.filter(r => (r.metadata.executionTime || 0) > 5000);
    if (slowOperations.length > 0) {
      patterns.push({
        type: 'PERFORMANCE_PATTERN',
        description: 'Slow operations detected (>5s)',
        confidence: 0.9,
        examples: slowOperations,
        metadata: {
          slowOperations: slowOperations.length,
          averageSlowTime: slowOperations.reduce((sum, r) => sum + (r.metadata.executionTime || 0), 0) / slowOperations.length
        }
      });
    }
    
    return patterns;
  }
  
  private identifyCorrelationPatterns(results: ToolResult[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Pattern: Tool success correlation
    const toolSuccessRates = this.calculateToolSuccessRates(results);
    const correlatedTools = this.findCorrelatedTools(toolSuccessRates);
    
    for (const correlation of correlatedTools) {
      patterns.push({
        type: 'CORRELATION_PATTERN',
        description: `Tools ${correlation.tools.join(' and ')} show correlated success rates`,
        confidence: correlation.confidence,
        examples: results.filter(r => correlation.tools.includes(r.tool)),
        metadata: {
          correlation: correlation.correlation,
          tools: correlation.tools,
          successRates: correlation.successRates
        }
      });
    }
    
    return patterns;
  }
  
  private detectCascadeFailures(results: ToolResult[]): ToolResult[] {
    const cascadeFailures: ToolResult[] = [];
    let inCascade = false;
    
    for (const result of results) {
      if (!result.success && !inCascade) {
        inCascade = true;
        cascadeFailures.push(result);
      } else if (!result.success && inCascade) {
        cascadeFailures.push(result);
      } else if (result.success && inCascade) {
        break; // End of cascade
      }
    }
    
    return cascadeFailures.length > 1 ? cascadeFailures : [];
  }
  
  private groupErrorsByType(failedSteps: ToolResult[]): Record<string, ToolResult[]> {
    const errorGroups: Record<string, ToolResult[]> = {};
    
    for (const step of failedSteps) {
      const errorType = step.error?.code || 'UNKNOWN_ERROR';
      if (!errorGroups[errorType]) {
        errorGroups[errorType] = [];
      }
      errorGroups[errorType].push(step);
    }
    
    return errorGroups;
  }
  
  private detectPerformanceDegradation(executionTimes: number[]): boolean {
    if (executionTimes.length < 3) return false;
    
    // Simple trend detection - check if times are generally increasing
    let increasingCount = 0;
    for (let i = 1; i < executionTimes.length; i++) {
      if (executionTimes[i] > executionTimes[i - 1]) {
        increasingCount++;
      }
    }
    
    return increasingCount / (executionTimes.length - 1) > 0.6; // 60% of steps show increase
  }
  
  private calculateDegradationRate(executionTimes: number[]): number {
    if (executionTimes.length < 2) return 0;
    
    const firstTime = executionTimes[0];
    const lastTime = executionTimes[executionTimes.length - 1];
    
    return ((lastTime - firstTime) / firstTime) * 100; // Percentage increase
  }
  
  private calculateToolSuccessRates(results: ToolResult[]): Record<string, number> {
    const toolStats: Record<string, { success: number; total: number }> = {};
    
    for (const result of results) {
      if (!toolStats[result.tool]) {
        toolStats[result.tool] = { success: 0, total: 0 };
      }
      toolStats[result.tool].total++;
      if (result.success) {
        toolStats[result.tool].success++;
      }
    }
    
    const successRates: Record<string, number> = {};
    for (const [tool, stats] of Object.entries(toolStats)) {
      successRates[tool] = stats.success / stats.total;
    }
    
    return successRates;
  }
  
  private findCorrelatedTools(toolSuccessRates: Record<string, number>): Array<{
    tools: string[];
    correlation: number;
    confidence: number;
    successRates: Record<string, number>;
  }> {
    const correlations: Array<{
      tools: string[];
      correlation: number;
      confidence: number;
      successRates: Record<string, number>;
    }> = [];
    
    const tools = Object.keys(toolSuccessRates);
    
    for (let i = 0; i < tools.length; i++) {
      for (let j = i + 1; j < tools.length; j++) {
        const tool1 = tools[i];
        const tool2 = tools[j];
        const rate1 = toolSuccessRates[tool1];
        const rate2 = toolSuccessRates[tool2];
        
        // Calculate correlation (simplified)
        const correlation = Math.abs(rate1 - rate2) < 0.1 ? 1.0 : 0.0;
        
        if (correlation > 0.8) {
          correlations.push({
            tools: [tool1, tool2],
            correlation,
            confidence: correlation,
            successRates: { [tool1]: rate1, [tool2]: rate2 }
          });
        }
      }
    }
    
    return correlations;
  }
}
```

### Step 2: Create Root Cause Analyzer
```typescript
// src/agents/analyzer/root-cause-analyzer.ts
export interface RootCauseAnalysis {
  cause: string;
  description: string;
  confidence: number;
  affectedSteps: number[];
  preventiveMeasures: string[];
  examples: ToolResult[];
}

export class RootCauseAnalyzer {
  analyzeFailures(results: ToolResult[]): RootCauseAnalysis[] {
    const analyses: RootCauseAnalysis[] = [];
    const failedSteps = results.filter(r => !r.success);
    
    if (failedSteps.length === 0) return analyses;
    
    // Analyze common root causes
    analyses.push(...this.analyzeConnectivityIssues(failedSteps));
    analyses.push(...this.analyzeValidationIssues(failedSteps));
    analyses.push(...this.analyzeResourceIssues(failedSteps));
    analyses.push(...this.analyzeDependencyIssues(results));
    
    return analyses.filter(a => a.confidence > 0.7);
  }
  
  private analyzeConnectivityIssues(failedSteps: ToolResult[]): RootCauseAnalysis[] {
    const analyses: RootCauseAnalysis[] = [];
    const connectivityFailures = failedSteps.filter(step => 
      step.error?.code === 'ECONNREFUSED' ||
      step.error?.message?.includes('connection refused') ||
      step.error?.message?.includes('timeout')
    );
    
    if (connectivityFailures.length > 0) {
      analyses.push({
        cause: 'CONNECTIVITY_ISSUES',
        description: 'Multiple connectivity-related failures detected',
        confidence: 0.9,
        affectedSteps: connectivityFailures.map((_, index) => index),
        preventiveMeasures: [
          'Implement connection pooling',
          'Add retry logic with exponential backoff',
          'Use circuit breaker pattern',
          'Monitor network health',
          'Implement fallback endpoints'
        ],
        examples: connectivityFailures
      });
    }
    
    return analyses;
  }
  
  private analyzeValidationIssues(failedSteps: ToolResult[]): RootCauseAnalysis[] {
    const analyses: RootCauseAnalysis[] = [];
    const validationFailures = failedSteps.filter(step =>
      step.error?.code === 'VALIDATION_ERROR' ||
      step.error?.message?.includes('validation failed') ||
      step.error?.message?.includes('invalid parameter')
    );
    
    if (validationFailures.length > 0) {
      analyses.push({
        cause: 'VALIDATION_ISSUES',
        description: 'Parameter validation failures detected',
        confidence: 0.8,
        affectedSteps: validationFailures.map((_, index) => index),
        preventiveMeasures: [
          'Implement pre-execution parameter validation',
          'Add parameter type checking',
          'Use schema validation',
          'Provide better error messages',
          'Add parameter examples and documentation'
        ],
        examples: validationFailures
      });
    }
    
    return analyses;
  }
  
  private analyzeResourceIssues(failedSteps: ToolResult[]): RootCauseAnalysis[] {
    const analyses: RootCauseAnalysis[] = [];
    const resourceFailures = failedSteps.filter(step =>
      step.error?.code === 'RESOURCE_EXHAUSTED' ||
      step.error?.message?.includes('memory') ||
      step.error?.message?.includes('rate limit') ||
      step.error?.message?.includes('quota exceeded')
    );
    
    if (resourceFailures.length > 0) {
      analyses.push({
        cause: 'RESOURCE_ISSUES',
        description: 'Resource exhaustion or rate limiting detected',
        confidence: 0.85,
        affectedSteps: resourceFailures.map((_, index) => index),
        preventiveMeasures: [
          'Implement rate limiting and throttling',
          'Add resource monitoring',
          'Optimize memory usage',
          'Implement caching strategies',
          'Add resource quotas and limits'
        ],
        examples: resourceFailures
      });
    }
    
    return analyses;
  }
  
  private analyzeDependencyIssues(results: ToolResult[]): RootCauseAnalysis[] {
    const analyses: RootCauseAnalysis[] = [];
    
    // Look for dependency-related failures
    for (let i = 1; i < results.length; i++) {
      const currentStep = results[i];
      const previousStep = results[i - 1];
      
      if (!currentStep.success && !previousStep.success) {
        analyses.push({
          cause: 'DEPENDENCY_CHAIN_FAILURE',
          description: `Dependency chain failure starting at step ${i - 1}`,
          confidence: 0.8,
          affectedSteps: [i - 1, i],
          preventiveMeasures: [
            'Implement dependency validation',
            'Add fallback strategies for failed dependencies',
            'Use circuit breaker for dependent services',
            'Implement retry logic for dependencies',
            'Add dependency health monitoring'
          ],
          examples: [previousStep, currentStep]
        });
      }
    }
    
    return analyses;
  }
}
```

### Step 3: Create Insight Generator
```typescript
// src/agents/analyzer/insight-generator.ts
export interface Insight {
  type: 'OPTIMIZATION' | 'RECOMMENDATION' | 'WARNING' | 'SUCCESS';
  title: string;
  description: string;
  confidence: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionable: boolean;
  suggestions: string[];
  metadata: any;
}

export class InsightGenerator {
  generateInsights(results: ToolResult[], patterns: Pattern[]): Insight[] {
    const insights: Insight[] = [];
    
    // Generate insights from patterns
    insights.push(...this.generatePatternInsights(patterns));
    
    // Generate performance insights
    insights.push(...this.generatePerformanceInsights(results));
    
    // Generate optimization insights
    insights.push(...this.generateOptimizationInsights(results));
    
    // Generate success insights
    insights.push(...this.generateSuccessInsights(results));
    
    return insights.filter(i => i.confidence > 0.7);
  }
  
  private generatePatternInsights(patterns: Pattern[]): Insight[] {
    const insights: Insight[] = [];
    
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'FAILURE_PATTERN':
          insights.push({
            type: 'WARNING',
            title: 'Failure Pattern Detected',
            description: pattern.description,
            confidence: pattern.confidence,
            impact: 'HIGH',
            actionable: true,
            suggestions: this.generateFailureSuggestions(pattern),
            metadata: pattern.metadata
          });
          break;
          
        case 'PERFORMANCE_PATTERN':
          insights.push({
            type: 'OPTIMIZATION',
            title: 'Performance Issue Detected',
            description: pattern.description,
            confidence: pattern.confidence,
            impact: 'MEDIUM',
            actionable: true,
            suggestions: this.generatePerformanceSuggestions(pattern),
            metadata: pattern.metadata
          });
          break;
          
        case 'CORRELATION_PATTERN':
          insights.push({
            type: 'RECOMMENDATION',
            title: 'Tool Correlation Found',
            description: pattern.description,
            confidence: pattern.confidence,
            impact: 'LOW',
            actionable: false,
            suggestions: ['Consider grouping correlated tools for better performance'],
            metadata: pattern.metadata
          });
          break;
      }
    }
    
    return insights;
  }
  
  private generatePerformanceInsights(results: ToolResult[]): Insight[] {
    const insights: Insight[] = [];
    const executionTimes = results.map(r => r.metadata.executionTime || 0);
    const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    
    // Slow execution insight
    if (avgTime > 3000) {
      insights.push({
        type: 'OPTIMIZATION',
        title: 'Slow Average Execution Time',
        description: `Average execution time is ${avgTime.toFixed(0)}ms, which is above optimal`,
        confidence: 0.9,
        impact: 'MEDIUM',
        actionable: true,
        suggestions: [
          'Consider parallel execution for independent steps',
          'Optimize slow tools',
          'Implement caching for repeated operations',
          'Review tool parameter optimization'
        ],
        metadata: { averageTime: avgTime, totalSteps: results.length }
      });
    }
    
    // Memory usage insight
    const memoryIntensiveSteps = results.filter(r => 
      r.tool.includes('list') && (r.metadata as any).resultSize > 1000
    );
    
    if (memoryIntensiveSteps.length > 0) {
      insights.push({
        type: 'WARNING',
        title: 'Memory Intensive Operations',
        description: `${memoryIntensiveSteps.length} steps are processing large datasets`,
        confidence: 0.8,
        impact: 'MEDIUM',
        actionable: true,
        suggestions: [
          'Implement pagination for large result sets',
          'Use streaming for large data processing',
          'Consider data filtering to reduce memory usage',
          'Monitor memory usage during execution'
        ],
        metadata: { memoryIntensiveSteps: memoryIntensiveSteps.length }
      });
    }
    
    return insights;
  }
  
  private generateOptimizationInsights(results: ToolResult[]): Insight[] {
    const insights: Insight[] = [];
    
    // Sequential execution optimization
    const sequentialSteps = results.filter((_, index) => index === 0 || results[index - 1].success);
    if (sequentialSteps.length === results.length && results.length > 3) {
      insights.push({
        type: 'OPTIMIZATION',
        title: 'Parallel Execution Opportunity',
        description: 'All steps executed sequentially - consider parallel execution',
        confidence: 0.8,
        impact: 'MEDIUM',
        actionable: true,
        suggestions: [
          'Identify independent steps for parallel execution',
          'Implement parallel execution framework',
          'Add dependency analysis to planner',
          'Consider batch operations where possible'
        ],
        metadata: { sequentialSteps: results.length }
      });
    }
    
    // Redundant operations insight
    const toolUsage = this.analyzeToolUsage(results);
    const redundantTools = Object.entries(toolUsage).filter(([_, count]) => count > 1);
    
    if (redundantTools.length > 0) {
      insights.push({
        type: 'OPTIMIZATION',
        title: 'Redundant Tool Usage',
        description: `${redundantTools.length} tools are used multiple times`,
        confidence: 0.7,
        impact: 'LOW',
        actionable: true,
        suggestions: [
          'Consider caching results from repeated tool calls',
          'Optimize plan to reduce redundant operations',
          'Implement result sharing between steps',
          'Review plan efficiency'
        ],
        metadata: { redundantTools: redundantTools.map(([tool, count]) => ({ tool, count })) }
      });
    }
    
    return insights;
  }
  
  private generateSuccessInsights(results: ToolResult[]): Insight[] {
    const insights: Insight[] = [];
    const successRate = results.filter(r => r.success).length / results.length;
    
    if (successRate === 1.0) {
      insights.push({
        type: 'SUCCESS',
        title: 'Perfect Execution',
        description: 'All steps executed successfully',
        confidence: 1.0,
        impact: 'LOW',
        actionable: false,
        suggestions: ['Maintain current execution strategy'],
        metadata: { successRate, totalSteps: results.length }
      });
    } else if (successRate > 0.9) {
      insights.push({
        type: 'SUCCESS',
        title: 'High Success Rate',
        description: `${(successRate * 100).toFixed(1)}% success rate achieved`,
        confidence: 0.9,
        impact: 'LOW',
        actionable: false,
        suggestions: ['Continue monitoring for potential improvements'],
        metadata: { successRate, totalSteps: results.length }
      });
    }
    
    return insights;
  }
  
  private generateFailureSuggestions(pattern: Pattern): string[] {
    const suggestions: string[] = [];
    
    if (pattern.metadata.errorType) {
      switch (pattern.metadata.errorType) {
        case 'ECONNREFUSED':
          suggestions.push('Implement connection retry logic');
          suggestions.push('Add fallback endpoints');
          suggestions.push('Monitor network connectivity');
          break;
        case 'VALIDATION_ERROR':
          suggestions.push('Add pre-execution parameter validation');
          suggestions.push('Improve parameter documentation');
          suggestions.push('Add parameter examples');
          break;
        case 'RATE_LIMITED':
          suggestions.push('Implement rate limiting and throttling');
          suggestions.push('Add request queuing');
          suggestions.push('Consider API quota management');
          break;
      }
    }
    
    if (pattern.metadata.cascadeLength > 1) {
      suggestions.push('Implement circuit breaker pattern');
      suggestions.push('Add dependency failure handling');
      suggestions.push('Consider plan replanning on failures');
    }
    
    return suggestions;
  }
  
  private generatePerformanceSuggestions(pattern: Pattern): string[] {
    const suggestions: string[] = [];
    
    if (pattern.metadata.trend === 'degrading') {
      suggestions.push('Investigate performance degradation causes');
      suggestions.push('Implement performance monitoring');
      suggestions.push('Consider resource optimization');
    }
    
    if (pattern.metadata.slowOperations > 0) {
      suggestions.push('Optimize slow operations');
      suggestions.push('Consider parallel execution');
      suggestions.push('Implement operation caching');
    }
    
    return suggestions;
  }
  
  private analyzeToolUsage(results: ToolResult[]): Record<string, number> {
    const usage: Record<string, number> = {};
    
    for (const result of results) {
      usage[result.tool] = (usage[result.tool] || 0) + 1;
    }
    
    return usage;
  }
}
```

### Step 4: Integrate with Enhanced Analyzer
```typescript
// src/agents/analyzer.ts - Enhanced version
export class EnhancedAnalyzer {
  private patternEngine: PatternRecognitionEngine;
  private rootCauseAnalyzer: RootCauseAnalyzer;
  private insightGenerator: InsightGenerator;
  
  constructor() {
    this.patternEngine = new PatternRecognitionEngine();
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
    this.insightGenerator = new InsightGenerator();
  }
  
  async analyzeResults(requestId: string, results: ToolResult[]): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Identify patterns
      const patterns = this.patternEngine.identifyPatterns(results);
      
      // Step 2: Analyze root causes
      const rootCauses = this.rootCauseAnalyzer.analyzeFailures(results);
      
      // Step 3: Generate insights
      const insights = this.insightGenerator.generateInsights(results, patterns);
      
      // Step 4: Create comprehensive analysis
      const analysis = this.createComprehensiveAnalysis(results, patterns, rootCauses, insights);
      
      return {
        requestId,
        analysis,
        metadata: {
          toolResultsCount: results.length,
          successfulResults: results.filter(r => r.success).length,
          failedResults: results.filter(r => !r.success).length,
          analysisTimeMs: Date.now() - startTime,
          patternsIdentified: patterns.length,
          rootCausesFound: rootCauses.length,
          insightsGenerated: insights.length
        }
      };
      
    } catch (error) {
      return {
        requestId,
        analysis: {
          summary: `Analysis failed: ${error.message}`,
          insights: [],
          entities: [],
          anomalies: [],
          metadata: {
            toolResultsCount: results.length,
            successfulResults: results.filter(r => r.success).length,
            failedResults: results.filter(r => !r.success).length,
            analysisTimeMs: Date.now() - startTime
          }
        }
      };
    }
  }
  
  private createComprehensiveAnalysis(
    results: ToolResult[],
    patterns: Pattern[],
    rootCauses: RootCauseAnalysis[],
    insights: Insight[]
  ): Analysis {
    const successRate = results.filter(r => r.success).length / results.length;
    
    // Create summary
    const summary = this.createSummary(results, patterns, rootCauses, insights);
    
    // Convert insights to analysis format
    const analysisInsights = insights.map(insight => ({
      type: insight.type,
      description: insight.description,
      confidence: insight.confidence,
      supportingData: insight.metadata
    }));
    
    // Create entities from results
    const entities = this.extractEntities(results);
    
    // Create anomalies from patterns and root causes
    const anomalies = this.createAnomalies(patterns, rootCauses);
    
    return {
      summary,
      insights: analysisInsights,
      entities,
      anomalies,
      metadata: {
        toolResultsCount: results.length,
        successfulResults: results.filter(r => r.success).length,
        failedResults: results.filter(r => !r.success).length,
        analysisTimeMs: 0 // Will be set by caller
      }
    };
  }
  
  private createSummary(
    results: ToolResult[],
    patterns: Pattern[],
    rootCauses: RootCauseAnalysis[],
    insights: Insight[]
  ): string {
    const successRate = (results.filter(r => r.success).length / results.length * 100).toFixed(1);
    const totalSteps = results.length;
    const failedSteps = results.filter(r => !r.success).length;
    
    let summary = `Execution completed with ${successRate}% success rate (${totalSteps - failedSteps}/${totalSteps} steps successful). `;
    
    if (failedSteps === 0) {
      summary += 'All steps executed successfully with no issues detected.';
    } else {
      summary += `${failedSteps} steps failed. `;
      
      if (rootCauses.length > 0) {
        summary += `Root cause analysis identified ${rootCauses.length} primary issues. `;
      }
      
      if (patterns.length > 0) {
        summary += `${patterns.length} patterns detected in execution results. `;
      }
    }
    
    const actionableInsights = insights.filter(i => i.actionable);
    if (actionableInsights.length > 0) {
      summary += `${actionableInsights.length} actionable insights generated for optimization.`;
    }
    
    return summary;
  }
  
  private extractEntities(results: ToolResult[]): Entity[] {
    const entities: Entity[] = [];
    
    // Extract entities from successful results
    results.filter(r => r.success).forEach((result, index) => {
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((item: any, itemIndex: number) => {
          if (item.id) {
            entities.push({
              id: item.id,
              type: this.inferEntityType(result.tool),
              name: item.name || item.id,
              attributes: item,
              relationships: []
            });
          }
        });
      }
    });
    
    return entities;
  }
  
  private inferEntityType(tool: string): string {
    if (tool.includes('facility')) return 'facility';
    if (tool.includes('shipment')) return 'shipment';
    if (tool.includes('contaminant')) return 'contaminant';
    if (tool.includes('inspection')) return 'inspection';
    return 'unknown';
  }
  
  private createAnomalies(patterns: Pattern[], rootCauses: RootCauseAnalysis[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Convert failure patterns to anomalies
    patterns.filter(p => p.type === 'FAILURE_PATTERN').forEach(pattern => {
      anomalies.push({
        type: 'EXECUTION_FAILURE',
        description: pattern.description,
        severity: 'HIGH',
        affectedEntities: pattern.examples.map((_, index) => `step-${index}`),
        data: pattern.metadata
      });
    });
    
    // Convert root causes to anomalies
    rootCauses.forEach(cause => {
      anomalies.push({
        type: 'ROOT_CAUSE',
        description: cause.description,
        severity: 'MEDIUM',
        affectedEntities: cause.affectedSteps.map(step => `step-${step}`),
        data: {
          cause: cause.cause,
          preventiveMeasures: cause.preventiveMeasures
        }
      });
    });
    
    return anomalies;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// src/agents/analyzer/__tests__/pattern-recognition.test.ts
describe('PatternRecognitionEngine', () => {
  test('should identify success patterns', () => {
    const engine = new PatternRecognitionEngine();
    const results: ToolResult[] = [
      { success: true, tool: 'test1', data: {}, metadata: { executionTime: 500 } },
      { success: true, tool: 'test2', data: {}, metadata: { executionTime: 600 } }
    ];
    
    const patterns = engine.identifyPatterns(results);
    
    expect(patterns.some(p => p.type === 'SUCCESS_PATTERN')).toBe(true);
  });
});
```

## 📊 Success Metrics

### Before Implementation
- **Actionable Insights:** 0%
- **Root Cause Analysis:** None
- **Pattern Recognition:** None

### After Implementation (Expected)
- **Actionable Insights:** 80%+ of analyses
- **Root Cause Analysis:** 90%+ accuracy
- **Pattern Recognition:** 85%+ confidence

---

**Priority:** P2 Medium  
**Estimated Effort:** 2-3 days  
**Risk Level:** Low  
**Dependencies:** Enhanced Analyzer


