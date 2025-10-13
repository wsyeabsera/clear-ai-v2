/**
 * Unit tests for IntentRecognizer
 */

import { IntentRecognizer } from '../../../agents/planner/intent-recognizer.js';

describe('IntentRecognizer', () => {
  let recognizer: IntentRecognizer;
  
  beforeEach(() => {
    recognizer = new IntentRecognizer();
  });
  
  describe('recognizeIntent', () => {
    it('should recognize CREATE intent', async () => {
      const intent = await recognizer.recognizeIntent('Create a new shipment from Berlin to Munich');
      
      expect(intent.type).toBe('CREATE');
      expect(intent.entities).toContain('shipment');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });
    
    it('should recognize READ intent', async () => {
      const intent = await recognizer.recognizeIntent('Get all facilities in Hannover');
      
      expect(intent.type).toBe('READ');
      expect(intent.entities).toContain('facility');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });
    
    it('should recognize UPDATE intent', async () => {
      const intent = await recognizer.recognizeIntent('Update the facility capacity');
      
      expect(intent.type).toBe('UPDATE');
      expect(intent.entities).toContain('facility');
      expect(intent.confidence).toBeGreaterThan(0.6);
    });
    
    it('should recognize DELETE intent', async () => {
      const intent = await recognizer.recognizeIntent('Delete the rejected shipment');
      
      expect(intent.type).toBe('DELETE');
      expect(intent.entities).toContain('shipment');
      expect(intent.confidence).toBeGreaterThan(0.6);
    });
    
    it('should recognize ANALYZE intent', async () => {
      const intent = await recognizer.recognizeIntent('Analyze contamination patterns and trends');
      
      expect(intent.type).toBe('ANALYZE');
      expect(intent.entities).toContain('contaminant');
      expect(intent.operations).toContain('analyze_contamination');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });
    
    it('should recognize MONITOR intent', async () => {
      const intent = await recognizer.recognizeIntent('Monitor facility performance');
      
      expect(intent.type).toBe('MONITOR');
      expect(intent.entities).toContain('facility');
      expect(intent.operations).toContain('analyze_performance');
      expect(intent.confidence).toBeGreaterThan(0.6);
    });
    
    it('should extract multiple entities', async () => {
      const intent = await recognizer.recognizeIntent('Get shipments and their contaminants');
      
      expect(intent.entities).toContain('shipment');
      expect(intent.entities).toContain('contaminant');
      expect(intent.entities.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should extract multiple operations', async () => {
      const intent = await recognizer.recognizeIntent('Find high-risk contaminants and check capacity');
      
      expect(intent.operations).toContain('filter_high_risk');
      expect(intent.operations).toContain('check_capacity');
      expect(intent.operations.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should handle complex queries', async () => {
      const intent = await recognizer.recognizeIntent(
        'Create a new shipment with 1500kg of plastic waste from Stuttgart to Frankfurt and monitor its contamination levels'
      );
      
      expect(intent.type).toBe('CREATE');
      expect(intent.entities).toContain('shipment');
      expect(intent.entities).toContain('contaminant');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });
    
    it('should default to READ intent for ambiguous queries', async () => {
      const intent = await recognizer.recognizeIntent('Hello world');
      
      expect(intent.type).toBe('READ');
      expect(intent.confidence).toBeLessThan(0.5);
    });
    
    it('should handle queries with special characters', async () => {
      const intent = await recognizer.recognizeIntent('Get facilities in "Hannover" and "Berlin"');
      
      expect(intent.type).toBe('READ');
      expect(intent.entities).toContain('facility');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });
  });
  
  describe('getSupportedIntents', () => {
    it('should return all supported intent types', () => {
      const intents = recognizer.getSupportedIntents();
      
      expect(intents).toContain('CREATE');
      expect(intents).toContain('READ');
      expect(intents).toContain('UPDATE');
      expect(intents).toContain('DELETE');
      expect(intents).toContain('ANALYZE');
      expect(intents).toContain('MONITOR');
    });
  });
  
  describe('getSupportedEntities', () => {
    it('should return all supported entities', () => {
      const entities = recognizer.getSupportedEntities();
      
      expect(entities).toContain('shipment');
      expect(entities).toContain('facility');
      expect(entities).toContain('contaminant');
      expect(entities).toContain('inspection');
      expect(entities).toContain('waste');
      expect(entities).toContain('analytics');
    });
  });
  
  describe('getSupportedOperations', () => {
    it('should return all supported operations', () => {
      const operations = recognizer.getSupportedOperations();
      
      expect(operations).toContain('high-risk');
      expect(operations).toContain('contamination');
      expect(operations).toContain('capacity');
      expect(operations).toContain('performance');
    });
  });
  
  describe('confidence calculation', () => {
    it('should have higher confidence for specific queries', async () => {
      const specificIntent = await recognizer.recognizeIntent(
        'Create a new shipment with high-risk contaminants from Berlin facility'
      );
      
      const vagueIntent = await recognizer.recognizeIntent('Get data');
      
      expect(specificIntent.confidence).toBeGreaterThan(vagueIntent.confidence);
    });
    
    it('should have higher confidence for multi-entity queries', async () => {
      const multiEntityIntent = await recognizer.recognizeIntent(
        'Analyze shipments and their contaminants in facilities'
      );
      
      const singleEntityIntent = await recognizer.recognizeIntent('Get shipments');
      
      expect(multiEntityIntent.confidence).toBeGreaterThan(singleEntityIntent.confidence);
    });
    
    it('should have higher confidence for action verbs', async () => {
      const actionIntent = await recognizer.recognizeIntent('Create new facility');
      
      const readIntent = await recognizer.recognizeIntent('Get facility');
      
      expect(actionIntent.confidence).toBeGreaterThan(readIntent.confidence);
    });
  });
});
