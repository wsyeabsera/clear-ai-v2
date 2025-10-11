/**
 * Response Builder Tests
 * Testing structured agent response creation
 */

import {
  ResponseBuilder,
  AgentResponse,
  ResponseType,
} from '../../../shared/response/builder.js';

describe('ResponseBuilder', () => {
  describe('answer', () => {
    it('should create an answer response', () => {
      const response = ResponseBuilder.answer('Found 10 shipments');
      
      expect(response.type).toBe('answer');
      expect(response.content).toBe('Found 10 shipments');
      expect(response.requiresInput).toBe(false);
    });
    
    it('should include data in answer', () => {
      const data = { shipments: [{ id: '1' }, { id: '2' }] };
      const response = ResponseBuilder.answer('Found 2 shipments', data);
      
      expect(response.data).toEqual(data);
    });
    
    it('should include confidence score', () => {
      const response = ResponseBuilder.answer('Likely a trend', undefined, 0.65);
      
      expect(response.confidence).toBe(0.65);
    });
  });
  
  describe('question', () => {
    it('should create a question response', () => {
      const response = ResponseBuilder.question(
        'Which time period?',
        ['today', 'this week', 'this month']
      );
      
      expect(response.type).toBe('question');
      expect(response.content).toBe('Which time period?');
      expect(response.options).toEqual(['today', 'this week', 'this month']);
      expect(response.requiresInput).toBe(true);
    });
    
    it('should work without options', () => {
      const response = ResponseBuilder.question('What facility are you interested in?');
      
      expect(response.type).toBe('question');
      expect(response.requiresInput).toBe(true);
    });
  });
  
  describe('progress', () => {
    it('should create a progress response', () => {
      const response = ResponseBuilder.progress(2, 5, 'Analyzing data');
      
      expect(response.type).toBe('progress');
      expect(response.progress).toBeDefined();
      expect(response.progress?.currentStep).toBe(2);
      expect(response.progress?.totalSteps).toBe(5);
      expect(response.progress?.stepName).toBe('Analyzing data');
      expect(response.requiresInput).toBe(false);
    });
    
    it('should calculate progress percentage in content', () => {
      const response = ResponseBuilder.progress(3, 10, 'Processing');
      
      expect(response.content).toContain('3/10');
      expect(response.content).toContain('30%');
    });
  });
  
  describe('acknowledge', () => {
    it('should create acknowledgment with default message', () => {
      const response = ResponseBuilder.acknowledge();
      
      expect(response.type).toBe('acknowledgment');
      expect(response.content).toBeTruthy();
      expect(response.requiresInput).toBe(false);
    });
    
    it('should create acknowledgment with custom message', () => {
      const response = ResponseBuilder.acknowledge('Got it, working on that');
      
      expect(response.content).toBe('Got it, working on that');
    });
  });
  
  describe('withConfidence', () => {
    it('should add confidence to any response', () => {
      const response = ResponseBuilder.answer('Result');
      const withConf = ResponseBuilder.withConfidence(response, 0.85);
      
      expect(withConf.confidence).toBe(0.85);
    });
    
    it('should add uncertainty disclaimer for low confidence', () => {
      const response = ResponseBuilder.answer('Possible trend');
      const withConf = ResponseBuilder.withConfidence(response, 0.55);
      
      expect(withConf.content).toContain('not completely certain');
    });
    
    it('should not add disclaimer for high confidence', () => {
      const response = ResponseBuilder.answer('Clear trend');
      const withConf = ResponseBuilder.withConfidence(response, 0.95);
      
      expect(withConf.content).not.toContain('not completely certain');
    });
  });
  
  describe('formatWithData', () => {
    it('should format response with data summary', () => {
      const data = {
        shipments: [{ id: '1' }, { id: '2' }, { id: '3' }],
        total: 3,
      };
      
      const response = ResponseBuilder.answer('Found shipments', data);
      const formatted = ResponseBuilder.formatWithData(response);
      
      expect(formatted).toContain('Found shipments');
      expect(formatted).toContain('3'); // Should mention count
    });
  });
  
  describe('isAwaitingUserInput', () => {
    it('should detect responses that need user input', () => {
      const question = ResponseBuilder.question('Choose one', ['a', 'b']);
      const answer = ResponseBuilder.answer('Here you go');
      
      expect(ResponseBuilder.isAwaitingUserInput(question)).toBe(true);
      expect(ResponseBuilder.isAwaitingUserInput(answer)).toBe(false);
    });
  });
});

