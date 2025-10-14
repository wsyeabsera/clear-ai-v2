/**
 * Intent Recognition Engine
 * Recognizes user intent from natural language queries
 */

import { Intent } from '../../shared/types/agent.js';

export class IntentRecognizer {
  private readonly intents = {
    CREATE: ['create', 'add', 'new', 'generate', 'make', 'build', 'establish', 'set up'],
    READ: ['get', 'find', 'list', 'show', 'display', 'fetch', 'retrieve', 'view', 'see', 'check'],
    UPDATE: ['update', 'modify', 'change', 'edit', 'alter', 'adjust', 'revise', 'correct', 'updating', 'modifying', 'changing', 'editing', 'setting', 'set'],
    DELETE: ['delete', 'remove', 'destroy', 'eliminate', 'clear', 'purge'],
    ANALYZE: ['analyze', 'examine', 'study', 'investigate', 'evaluate', 'assess', 'review', 'assess'],
    MONITOR: ['monitor', 'watch', 'track', 'observe', 'check', 'follow', 'supervise']
  };
  
  private readonly entities = [
    'shipment', 'facility', 'contaminant', 'inspection', 'waste', 'analytics', 'report'
  ];
  
  private readonly operations = [
    'high-risk', 'contamination', 'rejection', 'capacity', 'performance', 
    'quality', 'compliance', 'safety', 'efficiency'
  ];
  
  async recognizeIntent(query: string): Promise<Intent> {
    const words = query.toLowerCase().split(/\s+/);
    
    // Detect intent type
    const intentType = this.detectIntentType(words);
    
    // Extract entities
    const entities = this.extractEntities(query);
    
    // Identify operations
    const operations = this.extractOperations(query);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(intentType, entities, operations, words);
    
    return {
      type: intentType,
      entities,
      operations,
      confidence
    };
  }
  
  private detectIntentType(words: string[]): Intent['type'] {
    // Score each intent type based on keyword matches
    const scores: Record<string, number> = {};
    
    for (const [intent, keywords] of Object.entries(this.intents)) {
      scores[intent] = keywords.reduce((score, keyword) => {
        return score + (words.some(word => word.includes(keyword)) ? 1 : 0);
      }, 0);
    }
    
    // Enhanced UPDATE detection with pattern matching
    if (this.recognizeUpdateIntent(words.join(' '))) {
      scores.UPDATE = (scores.UPDATE || 0) + 2; // Boost UPDATE score
    }
    
    // Find the intent with highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'READ'; // Default fallback
    }
    
    const bestIntent = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
    return (bestIntent as Intent['type']) || 'READ';
  }

  /**
   * Enhanced UPDATE intent pattern recognition
   */
  private recognizeUpdateIntent(query: string): boolean {
    const updatePatterns = [
      /\b(update|modify|change|edit|set|alter)\b/i,
      /\b(updating|modifying|changing|editing|setting)\b/i,
      /\b(set\s+.*\s+to)\b/i, // "set X to Y" pattern
      /\b(change\s+.*\s+from.*\s+to)\b/i, // "change X from Y to Z" pattern
    ];
    
    return updatePatterns.some(pattern => pattern.test(query));
  }
  
  private extractEntities(query: string): string[] {
    const found: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entity of this.entities) {
      if (lowerQuery.includes(entity)) {
        found.push(entity);
      }
    }
    
    return found;
  }
  
  private extractOperations(query: string): string[] {
    const found: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const operation of this.operations) {
      if (lowerQuery.includes(operation)) {
        found.push(operation);
      }
    }
    
    // Extract specific operations from query patterns
    if (lowerQuery.includes('high-risk') || lowerQuery.includes('high risk')) {
      found.push('filter_high_risk');
    }
    if (lowerQuery.includes('capacity') || lowerQuery.includes('utilization')) {
      found.push('check_capacity');
    }
    if (lowerQuery.includes('contamination') || lowerQuery.includes('contaminant')) {
      found.push('analyze_contamination');
    }
    if (lowerQuery.includes('reject') || lowerQuery.includes('rejection')) {
      found.push('reject_shipment');
    }
    if (lowerQuery.includes('inspect') || lowerQuery.includes('inspection')) {
      found.push('create_inspection');
    }
    if (lowerQuery.includes('performance') || lowerQuery.includes('efficiency')) {
      found.push('analyze_performance');
    }
    
    return found;
  }
  
  private calculateConfidence(
    intent: string, 
    entities: string[], 
    operations: string[], 
    words: string[]
  ): number {
    let confidence = 0.3; // Base confidence
    
    // Intent recognition confidence
    if (intent !== 'READ') confidence += 0.2; // Non-default intent
    if (intent === 'CREATE' || intent === 'UPDATE' || intent === 'DELETE') confidence += 0.1; // Action verbs
    
    // Entity recognition confidence
    if (entities.length > 0) confidence += 0.2; // Entities found
    if (entities.length > 1) confidence += 0.1; // Multiple entities
    
    // Operation recognition confidence
    if (operations.length > 0) confidence += 0.1; // Operations found
    if (operations.length > 1) confidence += 0.1; // Multiple operations
    
    // Query complexity confidence
    if (words.length > 5) confidence += 0.05; // Longer queries often more specific
    if (words.length > 10) confidence += 0.05; // Very detailed queries
    
    // Specific pattern recognition
    if (words.some(word => word.includes('and'))) confidence += 0.05; // Multi-step operations
    if (words.some(word => word.includes('with'))) confidence += 0.05; // Detailed specifications
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Get all supported intent types
   */
  getSupportedIntents(): string[] {
    return Object.keys(this.intents);
  }
  
  /**
   * Get all supported entities
   */
  getSupportedEntities(): string[] {
    return [...this.entities];
  }
  
  /**
   * Get all supported operations
   */
  getSupportedOperations(): string[] {
    return [...this.operations];
  }
}
