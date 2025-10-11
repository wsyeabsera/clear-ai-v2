/**
 * Conversation Utilities Tests
 * Testing conversation helper functions
 */

import {
  ConversationUtils,
  BusinessEntities,
} from '../../../shared/conversation/utilities.js';

describe('ConversationUtils', () => {
  let utils: ConversationUtils;
  
  beforeEach(() => {
    utils = new ConversationUtils();
  });
  
  describe('isAffirmative', () => {
    it('should detect affirmative responses', () => {
      expect(utils.isAffirmative('yes')).toBe(true);
      expect(utils.isAffirmative('yeah')).toBe(true);
      expect(utils.isAffirmative('ok')).toBe(true);
      expect(utils.isAffirmative('sure')).toBe(true);
      expect(utils.isAffirmative('go ahead')).toBe(true);
    });
    
    it('should be case insensitive', () => {
      expect(utils.isAffirmative('YES')).toBe(true);
      expect(utils.isAffirmative('Ok')).toBe(true);
    });
    
    it('should reject non-affirmative', () => {
      expect(utils.isAffirmative('no')).toBe(false);
      expect(utils.isAffirmative('Show me data')).toBe(false);
    });
  });
  
  describe('isNegative', () => {
    it('should detect negative responses', () => {
      expect(utils.isNegative('no')).toBe(true);
      expect(utils.isNegative('nope')).toBe(true);
      expect(utils.isNegative('cancel')).toBe(true);
      expect(utils.isNegative('stop')).toBe(true);
    });
    
    it('should reject non-negative', () => {
      expect(utils.isNegative('yes')).toBe(false);
      expect(utils.isNegative('maybe')).toBe(false);
    });
  });
  
  describe('extractTimeframe', () => {
    it('should extract time references', () => {
      expect(utils.extractTimeframe('Show data from today')).toEqual({
        reference: 'today',
      });
      
      expect(utils.extractTimeframe('Shipments from last week')).toEqual({
        reference: 'last week',
      });
    });
    
    it('should extract date ranges', () => {
      const result = utils.extractTimeframe('From 2024-01-01 to 2024-01-31');
      
      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-01-31');
    });
    
    it('should return empty object when no timeframe', () => {
      expect(utils.extractTimeframe('Show all facilities')).toEqual({});
    });
  });
  
  describe('extractBusinessEntities', () => {
    it('should extract facility mentions', () => {
      const entities = utils.extractBusinessEntities('Show shipments from FacilityA and FacilityB');
      
      expect(entities.facilities).toHaveLength(2);
      expect(entities.facilities).toContain('FacilityA');
      expect(entities.facilities).toContain('FacilityB');
    });
    
    it('should extract status keywords', () => {
      const entities = utils.extractBusinessEntities('Show pending and delivered shipments');
      
      expect(entities.statuses).toContain('pending');
      expect(entities.statuses).toContain('delivered');
    });
    
    it('should extract waste types', () => {
      const entities = utils.extractBusinessEntities('Plastic and metal contamination');
      
      expect(entities.wasteTypes).toContain('plastic');
      expect(entities.wasteTypes).toContain('metal');
    });
    
    it('should extract dates', () => {
      const entities = utils.extractBusinessEntities('From 2024-01-01 to 2024-12-31');
      
      expect(entities.dates).toHaveLength(2);
      expect(entities.dates).toContain('2024-01-01');
      expect(entities.dates).toContain('2024-12-31');
    });
    
    it('should handle messages with no entities', () => {
      const entities = utils.extractBusinessEntities('Hello there');
      
      expect(entities.facilities).toHaveLength(0);
      expect(entities.statuses).toHaveLength(0);
      expect(entities.wasteTypes).toHaveLength(0);
      expect(entities.dates).toHaveLength(0);
    });
  });
  
  describe('extractReferences', () => {
    it('should detect pronoun references', () => {
      const refs = utils.extractReferences('Show me those');
      
      expect(refs).toContain('those');
    });
    
    it('should detect multiple references', () => {
      const refs = utils.extractReferences('Tell me more about them and that facility');
      
      expect(refs.length).toBeGreaterThan(0);
      expect(refs).toContain('them');
      expect(refs).toContain('that');
    });
    
    it('should return empty for no references', () => {
      const refs = utils.extractReferences('Show me shipments');
      
      expect(refs).toHaveLength(0);
    });
  });
  
  describe('isFollowUp', () => {
    it('should detect follow-up indicators', () => {
      expect(utils.isFollowUp('What about FacilityB?')).toBe(true);
      expect(utils.isFollowUp('And the rejected ones?')).toBe(true);
      expect(utils.isFollowUp('Also show facilities')).toBe(true);
    });
    
    it('should detect pronoun references as follow-ups', () => {
      expect(utils.isFollowUp('What about them?')).toBe(true);
      expect(utils.isFollowUp('Tell me more about it')).toBe(true);
    });
  });
  
  describe('simplifyForComparison', () => {
    it('should normalize text for comparison', () => {
      const normalized = utils.simplifyForComparison('  Show  ME  Data  ');
      
      expect(normalized).toBe('show me data');
    });
    
    it('should remove punctuation', () => {
      const normalized = utils.simplifyForComparison('What? Really!');
      
      expect(normalized).toBe('what really');
    });
  });
});

