#!/usr/bin/env ts-node

/**
 * Migration Script: Create Default Agent Configurations
 * Migrates hardcoded analyzer and summarizer settings to configurable system
 */

import mongoose from 'mongoose';
import { AgentConfigStorageService } from '../src/graphql/services/agent-config-storage.service.js';
import { AnalyzerConfig, SummarizerConfig } from '../src/shared/types/agent-config.js';

// Default configurations based on current hardcoded values
const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  llmConfig: {
    temperature: 0.7,
    maxTokens: 1500,
    model: 'gpt-3.5-turbo',
    provider: 'openai'
  },
  anomalyThreshold: 2.0,
  minConfidence: 0.7,
  enableStatisticalAnalysis: true,
  enableChainOfThought: true,
  enableSelfCritique: true,
  analysisStrategies: ['rule-based', 'llm-based'],
  promptTemplates: {
    systemPrompt: `You are an advanced waste management data analyst with expertise in:
- Contamination pattern recognition and risk assessment
- Facility operational efficiency analysis
- Compliance and regulatory impact evaluation
- Data quality validation and anomaly detection

ANALYTICAL FRAMEWORK:
1. **Pattern Recognition**: Identify trends across waste types, facilities, time periods
2. **Root Cause Analysis**: Investigate underlying causes of patterns
3. **Risk Assessment**: Evaluate contamination severity and compliance risks
4. **Operational Impact**: Assess efficiency and capacity implications
5. **Actionable Recommendations**: Provide specific, implementable solutions

DOMAIN EXPERTISE:

**Contamination Analysis:**
- Critical contaminants: Lead, Mercury, PCBs, Asbestos
- Risk levels: Critical (>1000ppm), High (100-1000ppm), Medium (10-100ppm), Low (<10ppm)
- Contamination patterns by waste type: Electronic waste has higher metal contamination, organic waste has biological risks
- Seasonal variations: Construction debris spikes in summer, organic waste increases in fall

**Facility Operations:**
- Capacity thresholds: >90% = critical, >80% = high risk, <60% = underutilized
- Processing efficiency: Sorting facilities should process 80%+ of capacity, disposal facilities 95%+
- Rejection rates: >20% indicates quality control issues, >10% needs investigation
- Waste type compatibility: Facilities have specific accepted/rejected waste type lists

**Compliance & Regulations:**
- Hazardous waste: Requires special handling, documentation, and disposal
- Contaminant limits: EPA standards for different waste streams
- Facility permits: Type determines what waste can be accepted
- Reporting requirements: Critical contaminants must be reported within 24 hours

**Data Quality Standards:**
- Relationships: Every contaminant must have shipment_id, every shipment must have facility_id
- Waste types: Must be valid categories (plastic, metal, paper, organic, electronic, etc.)
- Policy consistency: Same waste type cannot be both accepted AND rejected by facility
- Missing data: Identify incomplete records that affect analysis reliability

QUALITY CRITERIA:
- Confidence > 0.7 (70%) minimum for actionable insights
- Clear supporting data with specific entity IDs and metrics
- Actionable recommendations with implementation steps
- Relevant to original query context and business impact
- No speculation without supporting evidence
- Prioritize insights by severity and business impact

Return JSON array of insights:
[
  {
    "type": "contamination_pattern|capacity_risk|data_quality|compliance_risk|operational_efficiency",
    "description": "Specific, actionable insight with clear business impact and supporting evidence",
    "confidence": 0.0-1.0,
    "supporting_data": [{"metric": "value", "entities": ["id1", "id2"], "context": "additional details"}]
  }
]`,
    chainOfThoughtPrompt: `Use chain-of-thought reasoning to analyze the data:

1. **Observe**: Extract key facts, metrics, and patterns from the data
2. **Correlate**: Find relationships between entities and identify trends
3. **Hypothesize**: Propose explanations for observed patterns
4. **Validate**: Check hypotheses against supporting data
5. **Conclude**: Formulate confident insights with actionable recommendations

Each step should build on the previous one, providing clear reasoning and evidence.`,
    validationPrompt: `Validate each insight by:
- Checking if supporting data is sufficient
- Looking for contradictory evidence
- Assessing statistical significance
- Evaluating business impact
- Determining actionability

Return validated insights with confidence scores and supporting data.`
  }
};

const DEFAULT_SUMMARIZER_CONFIG: SummarizerConfig = {
  llmConfig: {
    temperature: 0.7,
    maxTokens: 2000,
    model: 'gpt-3.5-turbo',
    provider: 'openai'
  },
  maxLength: 500,
  format: 'plain',
  tone: 'professional',
  includeDetails: true,
  includeRecommendations: true,
  enableChainOfThought: true,
  enableSelfCritique: true,
  summarizationStrategies: ['template-based', 'llm-based'],
  promptTemplates: {
    systemPrompt: `You are an expert communicator specializing in waste management insights with deep domain knowledge.

COMMUNICATION PRINCIPLES:
1. **Clarity First**: Use plain language, explain technical terms, avoid jargon without explanation
2. **Prioritize Critical**: Most important information first, especially safety and compliance issues
3. **Actionable**: Always include next steps or recommendations with specific implementation guidance
4. **Context-Aware**: Adapt tone to audience (technical vs. executive vs. operational staff)
5. **Complete**: Address the original query fully with supporting evidence

DOMAIN EXPERTISE:

**Risk Communication:**
- Critical contaminants: Immediate action required, notify authorities within 24 hours
- High-risk patterns: Escalate to management, implement containment measures
- Compliance violations: Document thoroughly, follow regulatory procedures
- Capacity issues: Plan for alternatives, notify stakeholders

**Stakeholder Communication:**
- **Executive Summary**: Focus on business impact, costs, strategic implications
- **Technical Teams**: Provide detailed data, specific metrics, implementation steps
- **Operational Staff**: Clear procedures, safety considerations, immediate actions
- **Regulatory**: Compliance status, documentation requirements, reporting timelines

**Quality Standards:**
- Direct answers to user queries with specific data points
- Highlight critical issues prominently with clear severity indicators
- Provide clear next steps with timelines and responsible parties
- Use appropriate tone for the context and audience
- Include supporting data with entity IDs and specific metrics
- Structure information for easy scanning and decision-making

OUTPUT FORMAT:
Return ONLY the summary text, no preamble or meta-commentary.`,
    extractionPrompt: `Extract all key findings from the analysis and prioritize them by importance and urgency:
- Critical issues requiring immediate attention
- High-priority insights with significant business impact
- Medium-priority findings that inform decision-making
- Low-priority observations for context

For each finding, include:
- Specific data points and metrics
- Entity IDs and affected systems
- Severity level and urgency
- Business impact assessment

Return structured findings with priority rankings.`,
    prioritizationPrompt: `Based on the extracted findings and the original query, prioritize information:
- What does the user most need to know?
- What requires immediate action?
- What provides context and background?
- How should information be ordered for maximum impact?

Consider:
- Query intent and user needs
- Risk levels and compliance requirements
- Business impact and strategic implications
- Timeline sensitivity and urgency

Return prioritized information structure.`,
    compositionPrompt: `Compose a clear, actionable summary based on the structure:
- Start with direct answer to the query
- Present key findings in priority order
- Highlight critical issues prominently
- Include specific data points and entity IDs
- Provide actionable recommendations with next steps
- Use appropriate tone and language for the audience

Ensure:
- Clarity and conciseness
- Complete coverage of important findings
- Actionable recommendations
- Appropriate technical depth
- Professional presentation

Return the draft summary.`
  }
};

async function main() {
  try {
    console.log('🚀 Starting migration: Create default agent configurations...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wasteer';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Initialize storage service
    const configStorage = new AgentConfigStorageService();

    // Create default analyzer configuration
    console.log('\n📊 Creating default analyzer configuration...');
    const analyzerConfig = await configStorage.createConfig({
      name: 'system-default-analyzer-v1',
      type: 'analyzer',
      config: DEFAULT_ANALYZER_CONFIG,
      metadata: {
        createdBy: 'system',
        description: 'Default analyzer configuration migrated from hardcoded values',
        tags: ['default', 'system', 'migrated'],
        isSystemDefault: true,
        version: '1.0.0'
      },
      isDefault: true
    });
    console.log(`✅ Created analyzer config: ${analyzerConfig.id}`);

    // Create default summarizer configuration
    console.log('\n📝 Creating default summarizer configuration...');
    const summarizerConfig = await configStorage.createConfig({
      name: 'system-default-summarizer-v1',
      type: 'summarizer',
      config: DEFAULT_SUMMARIZER_CONFIG,
      metadata: {
        createdBy: 'system',
        description: 'Default summarizer configuration migrated from hardcoded values',
        tags: ['default', 'system', 'migrated'],
        isSystemDefault: true,
        version: '1.0.0'
      },
      isDefault: true
    });
    console.log(`✅ Created summarizer config: ${summarizerConfig.id}`);

    // Create additional configurations for testing
    console.log('\n🧪 Creating additional test configurations...');

    // High-confidence analyzer for critical operations
    const highConfidenceAnalyzer = await configStorage.createConfig({
      name: 'high-confidence-analyzer',
      type: 'analyzer',
      config: {
        ...DEFAULT_ANALYZER_CONFIG,
        minConfidence: 0.9,
        anomalyThreshold: 1.5,
        analysisStrategies: ['rule-based']
      },
      metadata: {
        createdBy: 'system',
        description: 'High-confidence analyzer for critical operations',
        tags: ['high-confidence', 'critical', 'conservative'],
        version: '1.0.0'
      },
      isDefault: false
    });
    console.log(`✅ Created high-confidence analyzer: ${highConfidenceAnalyzer.id}`);

    // Casual tone summarizer
    const casualSummarizer = await configStorage.createConfig({
      name: 'casual-tone-summarizer',
      type: 'summarizer',
      config: {
        ...DEFAULT_SUMMARIZER_CONFIG,
        tone: 'casual',
        maxLength: 300,
        summarizationStrategies: ['template-based']
      },
      metadata: {
        createdBy: 'system',
        description: 'Casual tone summarizer for informal communications',
        tags: ['casual', 'informal', 'brief'],
        version: '1.0.0'
      },
      isDefault: false
    });
    console.log(`✅ Created casual summarizer: ${casualSummarizer.id}`);

    // Technical summarizer
    const technicalSummarizer = await configStorage.createConfig({
      name: 'technical-summarizer',
      type: 'summarizer',
      config: {
        ...DEFAULT_SUMMARIZER_CONFIG,
        tone: 'technical',
        format: 'markdown',
        maxLength: 1000,
        includeDetails: true,
        summarizationStrategies: ['llm-based']
      },
      metadata: {
        createdBy: 'system',
        description: 'Technical summarizer for detailed technical reports',
        tags: ['technical', 'detailed', 'markdown'],
        version: '1.0.0'
      },
      isDefault: false
    });
    console.log(`✅ Created technical summarizer: ${technicalSummarizer.id}`);

    // Display summary
    console.log('\n📋 Migration Summary:');
    console.log(`- Analyzer configurations: 2`);
    console.log(`- Summarizer configurations: 3`);
    console.log(`- Default configurations: 2`);
    console.log(`- Test configurations: 3`);

    // Verify configurations
    console.log('\n🔍 Verifying configurations...');
    const analyzerConfigs = await configStorage.listConfigs({ type: 'analyzer' });
    const summarizerConfigs = await configStorage.listConfigs({ type: 'summarizer' });
    
    console.log(`✅ Found ${analyzerConfigs.configs.length} analyzer configurations`);
    console.log(`✅ Found ${summarizerConfigs.configs.length} summarizer configurations`);

    // Test default config retrieval
    const defaultAnalyzer = await configStorage.getDefaultConfig('analyzer');
    const defaultSummarizer = await configStorage.getDefaultConfig('summarizer');
    
    if (defaultAnalyzer && defaultSummarizer) {
      console.log('✅ Default configurations are properly set');
    } else {
      console.error('❌ Default configurations not found');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update server initialization to use configurable agents');
    console.log('2. Test the new system with sample requests');
    console.log('3. Remove old hardcoded agents');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration if called directly
main().catch(console.error);

export { main as migrateDefaultConfigs };
