/**
 * Entity Extractor
 * Extracts named entities and key information from messages
 */

import { Message } from '../types.js';

/**
 * Types of entities that can be extracted
 */
export type EntityType = 
  | 'facility' 
  | 'shipment' 
  | 'contaminant'
  | 'inspection'
  | 'status'
  | 'date'
  | 'waste_type'
  | 'location'
  | 'number'
  | 'other';

/**
 * Extracted entity from conversation
 */
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  frequency: number; // How many times mentioned
  firstMentioned: string; // ISO timestamp
  lastMentioned: string; // ISO timestamp
}

/**
 * Entity Extractor
 * Uses pattern matching and heuristics to extract entities from text
 */
export class EntityExtractor {
  // Common waste management status keywords
  private static readonly STATUS_KEYWORDS = [
    'pending', 'in_transit', 'delivered', 'rejected',
    'accepted', 'processing', 'completed',
  ];
  
  // Common waste types
  private static readonly WASTE_TYPES = [
    'plastic', 'metal', 'paper', 'glass', 'organic',
    'hazardous', 'electronic', 'industrial',
  ];
  
  /**
   * Extract entities from a single message
   */
  extractFromMessage(message: Message): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const text = message.content.toLowerCase();
    
    // Extract facility mentions (pattern: FacilityX or "facility X")
    const facilityMatches = message.content.match(/Facility[A-Z]|facility\s+\w+/gi);
    if (facilityMatches) {
      facilityMatches.forEach(match => {
        entities.push({
          type: 'facility',
          value: match,
          frequency: 1,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
        });
      });
    }
    
    // Extract status keywords
    EntityExtractor.STATUS_KEYWORDS.forEach(status => {
      if (text.includes(status)) {
        entities.push({
          type: 'status',
          value: status,
          frequency: 1,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
        });
      }
    });
    
    // Extract dates (YYYY-MM-DD format)
    const dateMatches = message.content.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches) {
      dateMatches.forEach(date => {
        entities.push({
          type: 'date',
          value: date,
          frequency: 1,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
        });
      });
    }
    
    // Extract waste types
    EntityExtractor.WASTE_TYPES.forEach(wasteType => {
      if (text.includes(wasteType)) {
        entities.push({
          type: 'waste_type',
          value: wasteType,
          frequency: 1,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
        });
      }
    });
    
    // Extract numbers (could be shipment IDs, counts, etc.)
    const numberMatches = message.content.match(/\b\d+\b/g);
    if (numberMatches && numberMatches.length <= 5) { // Limit to avoid too many
      numberMatches.forEach(num => {
        entities.push({
          type: 'number',
          value: num,
          frequency: 1,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
        });
      });
    }
    
    return entities;
  }
  
  /**
   * Extract and deduplicate entities from multiple messages
   */
  extractFromMessages(messages: Message[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();
    
    messages.forEach(message => {
      const entities = this.extractFromMessage(message);
      
      entities.forEach(entity => {
        const key = `${entity.type}:${entity.value}`;
        
        if (entityMap.has(key)) {
          const existing = entityMap.get(key)!;
          existing.frequency += 1;
          existing.lastMentioned = message.timestamp;
        } else {
          entityMap.set(key, entity);
        }
      });
    });
    
    return Array.from(entityMap.values());
  }
  
  /**
   * Get entities filtered by type
   */
  getEntitiesByType(entities: ExtractedEntity[], type: EntityType): ExtractedEntity[] {
    return entities.filter(e => e.type === type);
  }
  
  /**
   * Get most frequently mentioned entities
   */
  getMostFrequent(entities: ExtractedEntity[], n: number): ExtractedEntity[] {
    return entities
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, n);
  }
  
  /**
   * Convert entities to a text summary
   */
  toSummary(entities: ExtractedEntity[]): string {
    if (entities.length === 0) {
      return '';
    }
    
    const grouped = new Map<EntityType, ExtractedEntity[]>();
    
    entities.forEach(entity => {
      if (!grouped.has(entity.type)) {
        grouped.set(entity.type, []);
      }
      grouped.get(entity.type)!.push(entity);
    });
    
    const summaryParts: string[] = [];
    
    grouped.forEach((entities, type) => {
      const values = entities
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 3) // Top 3 per type
        .map(e => e.value)
        .join(', ');
      
      summaryParts.push(`${type}: ${values}`);
    });
    
    return summaryParts.join('; ');
  }
}

