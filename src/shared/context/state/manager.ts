/**
 * State Manager
 * Manages conversation state and phase transitions
 */

import { Message } from '../types.js';

/**
 * Conversation phases
 */
export type ConversationPhase = 
  | 'idle'
  | 'planning'
  | 'executing'
  | 'analyzing'
  | 'responding'
  | 'completed'
  | 'error';

/**
 * Phase transition history entry
 */
export interface PhaseHistoryEntry {
  phase: ConversationPhase;
  timestamp: string;
  duration?: number; // Duration in ms (set when transitioning to next phase)
}

/**
 * State transition record
 */
export interface StateTransition {
  from: ConversationPhase;
  to: ConversationPhase;
  timestamp: string;
}

/**
 * Conversation state metadata
 */
export interface StateMetadata {
  startedAt: string;
  lastUpdated: string;
  turnCount: number;
  phaseHistory: PhaseHistoryEntry[];
}

/**
 * Complete conversation state
 */
export interface ConversationState {
  id: string;
  userId?: string;
  phase: ConversationPhase;
  messages: Message[];
  entities: string[];
  metadata: StateMetadata;
  compressed: boolean;
  tokenCount: number;
}

/**
 * State Manager
 * Manages conversation state, phase transitions, and metadata
 */
export class StateManager {
  /**
   * Create a new conversation state
   */
  createState(conversationId: string, userId?: string): ConversationState {
    const now = new Date().toISOString();
    
    const state: ConversationState = {
      id: conversationId,
      phase: 'idle',
      messages: [],
      entities: [],
      metadata: {
        startedAt: now,
        lastUpdated: now,
        turnCount: 0,
        phaseHistory: [],
      },
      compressed: false,
      tokenCount: 0,
    };
    
    if (userId) {
      state.userId = userId;
    }
    
    return state;
  }
  
  /**
   * Transition to a new phase
   */
  transition(state: ConversationState, newPhase: ConversationPhase): ConversationState {
    const now = new Date().toISOString();
    const nowTimestamp = new Date(now).getTime();
    
    // Update duration of previous phase if it exists
    const updatedHistory = [...state.metadata.phaseHistory];
    if (updatedHistory.length > 0) {
      const lastEntry = updatedHistory[updatedHistory.length - 1]!;
      const lastTimestamp = new Date(lastEntry.timestamp).getTime();
      lastEntry.duration = nowTimestamp - lastTimestamp;
    }
    
    // Add new phase to history
    updatedHistory.push({
      phase: newPhase,
      timestamp: now,
    });
    
    return {
      ...state,
      phase: newPhase,
      metadata: {
        ...state.metadata,
        lastUpdated: now,
        phaseHistory: updatedHistory,
      },
    };
  }
  
  /**
   * Add a message to the state
   */
  addMessage(state: ConversationState, message: Message): ConversationState {
    const updatedMessages = [...state.messages, message];
    const tokenCount = updatedMessages.reduce((sum, m) => 
      sum + (m.tokenCount || 0), 0
    );
    
    return {
      ...state,
      messages: updatedMessages,
      tokenCount,
      metadata: {
        ...state.metadata,
        lastUpdated: new Date().toISOString(),
        turnCount: state.metadata.turnCount + 1,
      },
    };
  }
  
  /**
   * Add an entity to the state
   */
  addEntity(state: ConversationState, entity: string): ConversationState {
    // Deduplicate
    const entities = state.entities.includes(entity)
      ? state.entities
      : [...state.entities, entity];
    
    return {
      ...state,
      entities,
      metadata: {
        ...state.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Get current phase
   */
  getCurrentPhase(state: ConversationState): ConversationPhase {
    return state.phase;
  }
  
  /**
   * Get duration of a specific phase in milliseconds
   */
  getPhaseDuration(state: ConversationState, phase: ConversationPhase): number {
    const entry = state.metadata.phaseHistory.find(h => h.phase === phase);
    return entry?.duration || 0;
  }
  
  /**
   * Get total conversation duration in milliseconds
   */
  getConversationDuration(state: ConversationState): number {
    const start = new Date(state.metadata.startedAt).getTime();
    const end = new Date(state.metadata.lastUpdated).getTime();
    return end - start;
  }
  
  /**
   * Mark state as compressed
   */
  markAsCompressed(state: ConversationState): ConversationState {
    return {
      ...state,
      compressed: true,
      metadata: {
        ...state.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Get conversation summary
   */
  getSummary(state: ConversationState): {
    id: string;
    phase: ConversationPhase;
    messageCount: number;
    turnCount: number;
    entityCount: number;
    duration: number;
    compressed: boolean;
  } {
    return {
      id: state.id,
      phase: state.phase,
      messageCount: state.messages.length,
      turnCount: state.metadata.turnCount,
      entityCount: state.entities.length,
      duration: this.getConversationDuration(state),
      compressed: state.compressed,
    };
  }
}

