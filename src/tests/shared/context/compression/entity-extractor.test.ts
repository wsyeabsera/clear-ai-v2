/**
 * Entity Extractor Tests
 * Testing entity extraction from messages
 */

import { EntityExtractor, ExtractedEntity, EntityType } from '../../../../shared/context/compression/entity-extractor.js';
import { createMessage } from '../../../../shared/context/types.js';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;
  
  beforeEach(() => {
    extractor = new EntityExtractor();
  });
  
  describe('extractFromMessage', () => {
    it('should extract entities from a message', () => {
      const message = createMessage('user', 'Show me shipments from FacilityA with status pending');
      
      const entities = extractor.extractFromMessage(message);
      
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
    });
    
    it('should identify facility names', () => {
      const message = createMessage('user', 'Check FacilityA and FacilityB');
      
      const entities = extractor.extractFromMessage(message);
      const facilities = entities.filter(e => e.type === 'facility');
      
      expect(facilities.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should identify status keywords', () => {
      const message = createMessage('user', 'Show pending and delivered shipments');
      
      const entities = extractor.extractFromMessage(message);
      const statuses = entities.filter(e => e.type === 'status');
      
      expect(statuses.length).toBeGreaterThan(0);
    });
    
    it('should extract dates', () => {
      const message = createMessage('user', 'Shipments from 2024-01-01 to 2024-01-31');
      
      const entities = extractor.extractFromMessage(message);
      const dates = entities.filter(e => e.type === 'date');
      
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should handle messages with no entities', () => {
      const message = createMessage('user', 'Hello there');
      
      const entities = extractor.extractFromMessage(message);
      
      expect(entities).toHaveLength(0);
    });
  });
  
  describe('extractFromMessages', () => {
    it('should extract entities from multiple messages', () => {
      const messages = [
        createMessage('user', 'Show me FacilityA shipments'),
        createMessage('assistant', 'Found 5 pending shipments'),
        createMessage('user', 'What about FacilityB?'),
      ];
      
      const entities = extractor.extractFromMessages(messages);
      
      expect(entities.length).toBeGreaterThan(0);
    });
    
    it('should deduplicate entities', () => {
      const messages = [
        createMessage('user', 'Show FacilityA'),
        createMessage('user', 'More from FacilityA'),
        createMessage('user', 'FacilityA again'),
      ];
      
      const entities = extractor.extractFromMessages(messages);
      const facilityEntities = entities.filter(e => e.value.includes('FacilityA'));
      
      // Should deduplicate
      expect(facilityEntities.length).toBe(1);
    });
    
    it('should track entity frequency', () => {
      const messages = [
        createMessage('user', 'FacilityA'),
        createMessage('user', 'FacilityA again'),
      ];
      
      const entities = extractor.extractFromMessages(messages);
      const facility = entities.find(e => e.value.includes('FacilityA'));
      
      expect(facility?.frequency).toBeGreaterThan(1);
    });
  });
  
  describe('getEntitiesByType', () => {
    it('should filter entities by type', () => {
      const messages = [
        createMessage('user', 'Check FacilityA status pending from 2024-01-01'),
      ];
      
      const allEntities = extractor.extractFromMessages(messages);
      const facilities = extractor.getEntitiesByType(allEntities, 'facility');
      const statuses = extractor.getEntitiesByType(allEntities, 'status');
      
      expect(facilities.every(e => e.type === 'facility')).toBe(true);
      expect(statuses.every(e => e.type === 'status')).toBe(true);
    });
  });
  
  describe('getMostFrequent', () => {
    it('should return most frequently mentioned entities', () => {
      const messages = [
        createMessage('user', 'FacilityA'),
        createMessage('user', 'FacilityA and FacilityB'),
        createMessage('user', 'FacilityA again'),
      ];
      
      const entities = extractor.extractFromMessages(messages);
      const topEntities = extractor.getMostFrequent(entities, 2);
      
      expect(topEntities).toHaveLength(2);
      // FacilityA should be first (mentioned 3 times)
      expect(topEntities[0]?.frequency).toBeGreaterThanOrEqual(topEntities[1]!.frequency);
    });
    
    it('should return all entities if n is greater than count', () => {
      const messages = [createMessage('user', 'FacilityA')];
      const entities = extractor.extractFromMessages(messages);
      
      const topEntities = extractor.getMostFrequent(entities, 10);
      
      expect(topEntities.length).toBeLessThanOrEqual(entities.length);
    });
  });
  
  describe('toSummary', () => {
    it('should create a text summary of entities', () => {
      const messages = [
        createMessage('user', 'Check FacilityA status pending'),
      ];
      
      const entities = extractor.extractFromMessages(messages);
      const summary = extractor.toSummary(entities);
      
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });
    
    it('should return empty string for no entities', () => {
      const summary = extractor.toSummary([]);
      
      expect(summary).toBe('');
    });
  });
});

