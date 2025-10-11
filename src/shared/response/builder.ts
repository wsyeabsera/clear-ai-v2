/**
 * Response Builder
 * Creates structured agent responses for different scenarios
 */

/**
 * Response types for business conversations
 */
export type ResponseType =
  | 'answer'          // Direct answer with data
  | 'question'        // Need clarification
  | 'progress'        // Multi-step progress
  | 'acknowledgment'; // Simple acknowledgment

/**
 * Progress information
 */
export interface ProgressInfo {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentComplete: number;
}

/**
 * Agent response structure
 */
export interface AgentResponse {
  type: ResponseType;
  content: string;
  data?: any;
  confidence?: number;
  options?: string[];
  progress?: ProgressInfo;
  requiresInput?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Response Builder
 * Fluent API for creating structured agent responses
 */
export class ResponseBuilder {
  /**
   * Create an answer response
   */
  static answer(content: string, data?: any, confidence?: number): AgentResponse {
    const response: AgentResponse = {
      type: 'answer',
      content,
      requiresInput: false,
    };
    
    if (data !== undefined) {
      response.data = data;
    }
    
    if (confidence !== undefined) {
      response.confidence = confidence;
    }
    
    return response;
  }
  
  /**
   * Create a question response (agent needs clarification)
   */
  static question(content: string, options?: string[]): AgentResponse {
    const response: AgentResponse = {
      type: 'question',
      content,
      requiresInput: true,
    };
    
    if (options) {
      response.options = options;
    }
    
    return response;
  }
  
  /**
   * Create a progress response
   */
  static progress(current: number, total: number, stepName: string): AgentResponse {
    const percentComplete = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const response: AgentResponse = {
      type: 'progress',
      content: `Progress: ${current}/${total} (${percentComplete}%) - ${stepName}`,
      progress: {
        currentStep: current,
        totalSteps: total,
        stepName,
        percentComplete,
      },
      requiresInput: false,
    };
    
    return response;
  }
  
  /**
   * Create an acknowledgment response
   */
  static acknowledge(message?: string): AgentResponse {
    return {
      type: 'acknowledgment',
      content: message || '✓ Understood, working on it',
      requiresInput: false,
    };
  }
  
  /**
   * Add confidence score to a response
   */
  static withConfidence(response: AgentResponse, confidence: number): AgentResponse {
    const updated = { ...response, confidence };
    
    // Add uncertainty disclaimer for low confidence (< 0.7)
    if (confidence < 0.7 && response.type === 'answer') {
      updated.content = `${response.content}\n\n⚠️ Note: I'm not completely certain about this result (confidence: ${Math.round(confidence * 100)}%).`;
    }
    
    return updated;
  }
  
  /**
   * Format response with data summary
   */
  static formatWithData(response: AgentResponse): string {
    let formatted = response.content;
    
    if (response.data) {
      // Add data summary if it's an array or has a count
      if (Array.isArray(response.data)) {
        formatted += `\n\nResults: ${response.data.length} items`;
      } else if (response.data.total !== undefined) {
        formatted += `\n\nTotal: ${response.data.total}`;
      }
    }
    
    if (response.confidence !== undefined) {
      formatted += `\n\nConfidence: ${Math.round(response.confidence * 100)}%`;
    }
    
    return formatted;
  }
  
  /**
   * Check if response is awaiting user input
   */
  static isAwaitingUserInput(response: AgentResponse): boolean {
    return response.requiresInput === true;
  }
}

