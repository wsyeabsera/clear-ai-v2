/**
 * Conversation Utilities
 * Helper functions for business conversation handling
 */

/**
 * Business entities extracted from text
 */
export interface BusinessEntities {
  facilities: string[];
  statuses: string[];
  wasteTypes: string[];
  dates: string[];
}

/**
 * Timeframe extraction result
 */
export interface TimeframeResult {
  reference?: string;  // "today", "last week"
  from?: string;       // ISO date
  to?: string;         // ISO date
}

/**
 * Conversation Utilities
 * Helpers for natural business conversations
 */
export class ConversationUtils {
  // Affirmative words
  private static readonly AFFIRMATIVE = [
    'yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'go ahead', 'proceed',
  ];
  
  // Negative words
  private static readonly NEGATIVE = [
    'no', 'nope', 'nah', 'cancel', 'stop', 'abort',
  ];
  
  // Time references
  private static readonly TIME_REFERENCES = [
    'today', 'yesterday', 'this week', 'last week',
    'this month', 'last month', 'this year', 'last year',
  ];
  
  // Status keywords
  private static readonly STATUSES = [
    'pending', 'in_transit', 'delivered', 'rejected',
    'accepted', 'processing', 'completed',
  ];
  
  // Waste types
  private static readonly WASTE_TYPES = [
    'plastic', 'metal', 'paper', 'glass', 'organic',
    'hazardous', 'electronic', 'industrial',
  ];
  
  // Pronoun references
  private static readonly PRONOUNS = [
    'it', 'them', 'those', 'these', 'that', 'this',
  ];
  
  // Follow-up indicators
  private static readonly FOLLOWUP_INDICATORS = [
    'what about', 'how about', 'and', 'also', 'additionally',
  ];
  
  /**
   * Check if message is affirmative
   */
  isAffirmative(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ConversationUtils.AFFIRMATIVE.some(word => 
      lower === word || lower.startsWith(word + ' ')
    );
  }
  
  /**
   * Check if message is negative
   */
  isNegative(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ConversationUtils.NEGATIVE.some(word => 
      lower === word || lower.startsWith(word + ' ')
    );
  }
  
  /**
   * Extract timeframe from message
   */
  extractTimeframe(message: string): TimeframeResult {
    const lower = message.toLowerCase();
    const result: TimeframeResult = {};
    
    // Check for time references
    for (const ref of ConversationUtils.TIME_REFERENCES) {
      if (lower.includes(ref)) {
        result.reference = ref;
        break;
      }
    }
    
    // Extract date ranges (YYYY-MM-DD format)
    const datePattern = /\d{4}-\d{2}-\d{2}/g;
    const dates = message.match(datePattern);
    
    if (dates && dates.length >= 2) {
      if (dates[0]) result.from = dates[0];
      if (dates[1]) result.to = dates[1];
    } else if (dates && dates.length === 1) {
      if (dates[0]) result.from = dates[0];
    }
    
    return result;
  }
  
  /**
   * Extract business entities from message
   */
  extractBusinessEntities(message: string): BusinessEntities {
    const lower = message.toLowerCase();
    
    const entities: BusinessEntities = {
      facilities: [],
      statuses: [],
      wasteTypes: [],
      dates: [],
    };
    
    // Extract facility mentions (pattern: FacilityX)
    const facilityMatches = message.match(/Facility[A-Z]/g);
    if (facilityMatches) {
      entities.facilities = facilityMatches;
    }
    
    // Extract statuses
    for (const status of ConversationUtils.STATUSES) {
      if (lower.includes(status)) {
        entities.statuses.push(status);
      }
    }
    
    // Extract waste types
    for (const wasteType of ConversationUtils.WASTE_TYPES) {
      if (lower.includes(wasteType)) {
        entities.wasteTypes.push(wasteType);
      }
    }
    
    // Extract dates
    const dateMatches = message.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches) {
      entities.dates = dateMatches;
    }
    
    return entities;
  }
  
  /**
   * Extract pronoun references from message
   */
  extractReferences(message: string): string[] {
    const lower = message.toLowerCase();
    const refs: string[] = [];
    
    for (const pronoun of ConversationUtils.PRONOUNS) {
      if (lower.includes(pronoun)) {
        refs.push(pronoun);
      }
    }
    
    return refs;
  }
  
  /**
   * Check if message is a follow-up
   */
  isFollowUp(message: string): boolean {
    const lower = message.toLowerCase();
    
    // Check for follow-up indicators
    const hasIndicator = ConversationUtils.FOLLOWUP_INDICATORS.some(indicator =>
      lower.includes(indicator)
    );
    
    // Check for pronoun references
    const hasPronouns = this.extractReferences(message).length > 0;
    
    return hasIndicator || hasPronouns;
  }
  
  /**
   * Simplify text for comparison (normalize)
   */
  simplifyForComparison(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ');    // Normalize whitespace
  }
}

