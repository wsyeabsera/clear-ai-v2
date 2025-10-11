/**
 * Conversational Dialog Integration Tests
 * Tests end-to-end conversational scenarios
 */

import { ResponseBuilder } from '../../../shared/response/builder.js';
import { IntentClassifier } from '../../../shared/intent/classifier.js';
import { ConfidenceScorer } from '../../../shared/confidence/scorer.js';
import { ProgressTracker } from '../../../shared/progress/tracker.js';
import { ConversationUtils } from '../../../shared/conversation/utilities.js';

describe('Conversational Dialog Integration', () => {
  describe('Scenario: Ambiguous Query → Clarification → Response', () => {
    it('should handle clarification flow', () => {
      const classifier = new IntentClassifier();
      
      // User: "Show shipments"
      const intent1 = classifier.classify('Show shipments');
      expect(intent1.intent).toBe('query');
      
      // Agent asks for clarification
      const agentQuestion = ResponseBuilder.question(
        'Which time period?',
        ['today', 'this week', 'this month']
      );
      expect(agentQuestion.requiresInput).toBe(true);
      
      // User: "this week"
      const intent2 = classifier.classify('this week', {
        awaitingClarification: true,
        lastQuestion: 'Which time period?',
      });
      expect(intent2.intent).toBe('clarification');
      
      // Agent provides answer
      const agentAnswer = ResponseBuilder.answer(
        'Found 15 shipments from this week',
        { shipments: Array(15).fill({}), total: 15 }
      );
      expect(agentAnswer.type).toBe('answer');
    });
  });
  
  describe('Scenario: Uncertain Result → Express Confidence', () => {
    it('should express uncertainty for low confidence results', () => {
      const scorer = new ConfidenceScorer();
      
      // Simulate low-quality data
      const confidence = scorer.scoreFromDataCount(3, 50); // Only 6% of expected data
      
      expect(confidence).toBeLessThan(0.7);
      expect(scorer.shouldExpressUncertainty(confidence)).toBe(true);
      
      // Build response with uncertainty
      const response = ResponseBuilder.answer(
        'Possible upward trend detected',
        { trend: 'up', dataPoints: 3 }
      );
      
      const withConfidence = ResponseBuilder.withConfidence(response, confidence);
      
      expect(withConfidence.content).toContain('not completely certain');
      expect(withConfidence.confidence).toBeLessThan(0.7);
    });
    
    it('should express confidence for high-quality results', () => {
      const scorer = new ConfidenceScorer();
      
      const confidence = scorer.scoreFromDataCount(150, 100); // 150% of expected
      
      expect(confidence).toBeGreaterThan(0.9);
      expect(scorer.shouldExpressUncertainty(confidence)).toBe(false);
    });
  });
  
  describe('Scenario: Multi-Step Task with Progress', () => {
    it('should track and report progress through workflow', () => {
      const tracker = new ProgressTracker();
      
      // Start multi-step analysis
      tracker.startTask('analysis_1', 4);
      
      // Step 1
      tracker.updateStep('analysis_1', 1, 'Fetching shipments');
      let progress = ResponseBuilder.progress(1, 4, 'Fetching shipments');
      expect(progress.progress?.percentComplete).toBe(25);
      
      // Step 2
      tracker.updateStep('analysis_1', 2, 'Analyzing contamination');
      progress = ResponseBuilder.progress(2, 4, 'Analyzing contamination');
      expect(progress.progress?.percentComplete).toBe(50);
      
      // Step 3
      tracker.updateStep('analysis_1', 3, 'Calculating metrics');
      progress = ResponseBuilder.progress(3, 4, 'Calculating metrics');
      expect(progress.progress?.percentComplete).toBe(75);
      
      // Complete
      tracker.complete('analysis_1');
      const final = ResponseBuilder.acknowledge('✓ Analysis complete!');
      expect(final.type).toBe('acknowledgment');
      
      const taskProgress = tracker.getProgress('analysis_1');
      expect(taskProgress?.status).toBe('completed');
    });
  });
  
  describe('Scenario: Follow-Up Questions', () => {
    it('should detect and handle follow-ups', () => {
      const classifier = new IntentClassifier();
      const utils = new ConversationUtils();
      
      // Initial query
      const intent1 = classifier.classify('Get all facilities');
      expect(intent1.intent).toBe('query');
      
      // Agent returns data
      // ...
      
      // User follow-up: "What about the contaminated ones?"
      const intent2 = classifier.classify('What about the contaminated ones?');
      expect(intent2.intent).toBe('followup');
      expect(utils.isFollowUp('What about the contaminated ones?')).toBe(true);
      
      // Extract entities to understand what they're asking about
      const entities = utils.extractBusinessEntities('What about the contaminated ones?');
      // Agent should filter previous results by contamination
    });
  });
  
  describe('Scenario: Yes/No Confirmation', () => {
    it('should handle confirmation flow', () => {
      const classifier = new IntentClassifier();
      const utils = new ConversationUtils();
      
      // Agent asks for confirmation
      const question = ResponseBuilder.question(
        'This will analyze all shipments. Continue?'
      );
      expect(question.requiresInput).toBe(true);
      
      // User: "yes"
      const intent = classifier.classify('yes');
      expect(intent.intent).toBe('confirmation');
      expect(utils.isAffirmative('yes')).toBe(true);
      
      // Agent proceeds
      const ack = ResponseBuilder.acknowledge('Starting analysis...');
      expect(ack.type).toBe('acknowledgment');
    });
    
    it('should handle negative confirmation', () => {
      const utils = new ConversationUtils();
      
      expect(utils.isNegative('no')).toBe(true);
      expect(utils.isNegative('cancel')).toBe(true);
      
      // Agent should not proceed
    });
  });
});

