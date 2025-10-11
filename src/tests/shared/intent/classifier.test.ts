/**
 * Intent Classifier Tests
 * Testing user intent detection for business queries
 */

import {
  IntentClassifier,
  UserIntent,
  IntentResult,
} from '../../../shared/intent/classifier.js';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;
  
  beforeEach(() => {
    classifier = new IntentClassifier();
  });
  
  describe('classify', () => {
    it('should classify query intent', () => {
      const result = classifier.classify('Show me all contaminated shipments');
      
      expect(result.intent).toBe('query');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    it('should classify question intent', () => {
      const result = classifier.classify('What is the contamination rate?');
      
      expect(result.intent).toBe('question');
    });
    
    it('should classify clarification intent', () => {
      const result = classifier.classify('this week', {
        awaitingClarification: true,
      });
      
      expect(result.intent).toBe('clarification');
    });
    
    it('should classify confirmation intent', () => {
      expect(classifier.classify('yes').intent).toBe('confirmation');
      expect(classifier.classify('no').intent).toBe('confirmation');
      expect(classifier.classify('ok').intent).toBe('confirmation');
      expect(classifier.classify('proceed').intent).toBe('confirmation');
    });
    
    it('should classify follow-up intent', () => {
      const result = classifier.classify('What about FacilityB?');
      
      expect(result.intent).toBe('followup');
    });
  });
  
  describe('isQuery', () => {
    it('should detect query patterns', () => {
      expect(classifier.isQuery('Show me shipments')).toBe(true);
      expect(classifier.isQuery('Get all facilities')).toBe(true);
      expect(classifier.isQuery('List contaminated items')).toBe(true);
      expect(classifier.isQuery('Find shipments from FacilityA')).toBe(true);
    });
    
    it('should reject non-query patterns', () => {
      expect(classifier.isQuery('What is a shipment?')).toBe(false);
      expect(classifier.isQuery('yes')).toBe(false);
    });
  });
  
  describe('isQuestion', () => {
    it('should detect question patterns', () => {
      expect(classifier.isQuestion('What is the status?')).toBe(true);
      expect(classifier.isQuestion('How many shipments?')).toBe(true);
      expect(classifier.isQuestion('Why was it rejected?')).toBe(true);
      expect(classifier.isQuestion('When did this happen?')).toBe(true);
    });
    
    it('should reject non-question patterns', () => {
      expect(classifier.isQuestion('Show me data')).toBe(false);
    });
  });
  
  describe('isConfirmation', () => {
    it('should detect affirmative confirmations', () => {
      expect(classifier.isConfirmation('yes')).toBe('yes');
      expect(classifier.isConfirmation('yeah')).toBe('yes');
      expect(classifier.isConfirmation('ok')).toBe('yes');
      expect(classifier.isConfirmation('sure')).toBe('yes');
      expect(classifier.isConfirmation('proceed')).toBe('yes');
      expect(classifier.isConfirmation('go ahead')).toBe('yes');
    });
    
    it('should detect negative confirmations', () => {
      expect(classifier.isConfirmation('no')).toBe('no');
      expect(classifier.isConfirmation('nope')).toBe('no');
      expect(classifier.isConfirmation('cancel')).toBe('no');
      expect(classifier.isConfirmation('stop')).toBe('no');
      expect(classifier.isConfirmation('nevermind')).toBe('no');
    });
    
    it('should return null for non-confirmations', () => {
      expect(classifier.isConfirmation('Show me data')).toBeNull();
      expect(classifier.isConfirmation('What about X?')).toBeNull();
    });
    
    it('should be case insensitive', () => {
      expect(classifier.isConfirmation('YES')).toBe('yes');
      expect(classifier.isConfirmation('No')).toBe('no');
    });
  });
  
  describe('isFollowUp', () => {
    it('should detect follow-up patterns', () => {
      expect(classifier.isFollowUp('What about FacilityB?')).toBe(true);
      expect(classifier.isFollowUp('And the contamination?')).toBe(true);
      expect(classifier.isFollowUp('How about yesterday?')).toBe(true);
      expect(classifier.isFollowUp('Also show me facilities')).toBe(true);
    });
    
    it('should detect pronoun references', () => {
      expect(classifier.isFollowUp('What about them?')).toBe(true);
      expect(classifier.isFollowUp('Show me those')).toBe(true);
      expect(classifier.isFollowUp('Tell me more about it')).toBe(true);
    });
  });
  
  describe('extractTimeframe', () => {
    it('should extract relative time references', () => {
      expect(classifier.extractTimeframe('Show shipments from today')).toBe('today');
      expect(classifier.extractTimeframe('What happened yesterday')).toBe('yesterday');
      expect(classifier.extractTimeframe('Data from this week')).toBe('this week');
      expect(classifier.extractTimeframe('Last month analysis')).toBe('last month');
    });
    
    it('should return null when no timeframe found', () => {
      expect(classifier.extractTimeframe('Show all data')).toBeNull();
    });
  });
  
  describe('extractAction', () => {
    it('should extract action verbs', () => {
      expect(classifier.extractAction('Show me shipments')).toBe('show');
      expect(classifier.extractAction('Get all facilities')).toBe('get');
      expect(classifier.extractAction('List contaminated items')).toBe('list');
      expect(classifier.extractAction('Find pending shipments')).toBe('find');
      expect(classifier.extractAction('Analyze facility performance')).toBe('analyze');
    });
    
    it('should return null when no clear action', () => {
      expect(classifier.extractAction('yes')).toBeNull();
      expect(classifier.extractAction('What about it?')).toBeNull();
    });
  });
  
  describe('context-aware classification', () => {
    it('should use context when agent is awaiting clarification', () => {
      const result = classifier.classify('this week', {
        awaitingClarification: true,
        lastQuestion: 'Which time period?',
      });
      
      expect(result.intent).toBe('clarification');
    });
    
    it('should detect follow-ups based on context', () => {
      const result = classifier.classify('What about the rejected ones?', {
        lastQuery: 'Show me delivered shipments',
      });
      
      expect(result.intent).toBe('followup');
    });
  });
});

