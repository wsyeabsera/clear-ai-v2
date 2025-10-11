/**
 * Intent Classifier
 * Detects user intent from messages for business conversations
 */

/**
 * User intent types for business queries
 */
export type UserIntent =
  | 'query'           // "Show me X", "Get Y"
  | 'question'        // "What is X?", "How many Y?"
  | 'clarification'   // Answering agent's question
  | 'confirmation'    // "yes", "no", "ok"
  | 'followup';       // Referring to previous results

/**
 * Conversation context for classification
 */
export interface ConversationContext {
  awaitingClarification?: boolean;
  lastQuestion?: string;
  lastQuery?: string;
}

/**
 * Intent classification result
 */
export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  action?: string | null;
  timeframe?: string | null;
}

/**
 * Intent Classifier
 * Uses pattern matching to detect user intent
 */
export class IntentClassifier {
  // Query action verbs
  private static readonly QUERY_VERBS = [
    'show', 'get', 'list', 'find', 'fetch', 'display', 'retrieve',
    'give', 'pull', 'search', 'filter', 'query', 'analyze',
  ];
  
  // Question words
  private static readonly QUESTION_WORDS = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
  ];
  
  // Affirmative confirmations
  private static readonly AFFIRMATIVE = [
    'yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'proceed',
    'go ahead', 'continue', 'confirm', 'approve', 'accept',
  ];
  
  // Negative confirmations
  private static readonly NEGATIVE = [
    'no', 'nope', 'nah', 'cancel', 'stop', 'abort', 'deny',
    'reject', 'nevermind', 'never mind', 'don\'t',
  ];
  
  // Time references
  private static readonly TIMEFRAMES = [
    'today', 'yesterday', 'this week', 'last week',
    'this month', 'last month', 'this year',
  ];
  
  /**
   * Classify user message intent
   */
  classify(message: string, context?: ConversationContext): IntentResult {
    
    // If agent is awaiting clarification, classify as clarification
    if (context?.awaitingClarification) {
      return {
        intent: 'clarification',
        confidence: 0.9,
      };
    }
    
    // Check for confirmation (yes/no)
    const confirmation = this.isConfirmation(message);
    if (confirmation !== null) {
      return {
        intent: 'confirmation',
        confidence: 0.95,
      };
    }
    
    // Check for follow-up
    if (this.isFollowUp(message)) {
      return {
        intent: 'followup',
        confidence: 0.85,
      };
    }
    
    // Check for question
    if (this.isQuestion(message)) {
      return {
        intent: 'question',
        confidence: 0.9,
      };
    }
    
    // Check for query/command
    if (this.isQuery(message)) {
      return {
        intent: 'query',
        confidence: 0.85,
        action: this.extractAction(message),
        timeframe: this.extractTimeframe(message),
      };
    }
    
    // Default to query with lower confidence
    return {
      intent: 'query',
      confidence: 0.5,
    };
  }
  
  /**
   * Check if message is a query/command
   */
  isQuery(message: string): boolean {
    const lower = message.toLowerCase();
    
    // Check for query verbs
    return IntentClassifier.QUERY_VERBS.some(verb => 
      lower.startsWith(verb + ' ') || lower.includes(' ' + verb + ' ')
    );
  }
  
  /**
   * Check if message is a question
   */
  isQuestion(message: string): boolean {
    const lower = message.toLowerCase();
    
    // Starts with question word or ends with ?
    return IntentClassifier.QUESTION_WORDS.some(word => 
      lower.startsWith(word + ' ')
    ) || message.trim().endsWith('?');
  }
  
  /**
   * Check if message is a confirmation (yes/no)
   */
  isConfirmation(message: string): 'yes' | 'no' | null {
    const lower = message.toLowerCase().trim();
    
    // Check affirmative
    if (IntentClassifier.AFFIRMATIVE.some(word => lower === word || lower.startsWith(word + ' '))) {
      return 'yes';
    }
    
    // Check negative
    if (IntentClassifier.NEGATIVE.some(word => lower === word || lower.startsWith(word + ' '))) {
      return 'no';
    }
    
    return null;
  }
  
  /**
   * Check if message is a follow-up
   */
  isFollowUp(message: string): boolean {
    const lower = message.toLowerCase();
    
    // Check for multi-word indicators (exact match)
    const multiWordIndicators = ['what about', 'how about'];
    if (multiWordIndicators.some(phrase => lower.includes(phrase))) {
      return true;
    }
    
    // Check for single-word indicators (word boundary match)
    const singleWordIndicators = ['and', 'also', 'additionally', 'furthermore'];
    const wordBoundaryMatch = singleWordIndicators.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lower);
    });
    
    if (wordBoundaryMatch) {
      return true;
    }
    
    // Check for pronouns (word boundary match to avoid false positives)
    const pronouns = ['them', 'those', 'these', 'it', 'that'];
    return pronouns.some(pronoun => {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'i');
      return regex.test(lower);
    });
  }
  
  /**
   * Extract timeframe from message
   */
  extractTimeframe(message: string): string | null {
    const lower = message.toLowerCase();
    
    for (const timeframe of IntentClassifier.TIMEFRAMES) {
      if (lower.includes(timeframe)) {
        return timeframe;
      }
    }
    
    return null;
  }
  
  /**
   * Extract action verb from message
   */
  extractAction(message: string): string | null {
    const lower = message.toLowerCase();
    
    for (const verb of IntentClassifier.QUERY_VERBS) {
      if (lower.startsWith(verb + ' ') || lower.includes(' ' + verb + ' ')) {
        return verb;
      }
    }
    
    return null;
  }
}

