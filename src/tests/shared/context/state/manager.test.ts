/**
 * State Manager Tests
 * Testing conversation state management
 */

import {
  StateManager,
  ConversationState,
  ConversationPhase,
  StateTransition,
} from '../../../../shared/context/state/manager.js';
import { createMessage } from '../../../../shared/context/types.js';

describe('StateManager', () => {
  let manager: StateManager;
  
  beforeEach(() => {
    manager = new StateManager();
  });
  
  describe('initialization', () => {
    it('should create a new conversation state', () => {
      const state = manager.createState('conv_1');
      
      expect(state.id).toBe('conv_1');
      expect(state.phase).toBe('idle');
      expect(state.messages).toHaveLength(0);
      expect(state.entities).toHaveLength(0);
      expect(state.metadata).toBeDefined();
    });
    
    it('should initialize with user ID if provided', () => {
      const state = manager.createState('conv_2', 'user_123');
      
      expect(state.userId).toBe('user_123');
    });
  });
  
  describe('state transitions', () => {
    it('should transition from idle to planning', () => {
      const state = manager.createState('conv_1');
      
      const updated = manager.transition(state, 'planning');
      
      expect(updated.phase).toBe('planning');
      expect(updated.metadata.phaseHistory).toHaveLength(1);
      expect(updated.metadata.phaseHistory[0]?.phase).toBe('planning');
    });
    
    it('should track phase history', () => {
      const state = manager.createState('conv_1');
      
      let updated = manager.transition(state, 'planning');
      updated = manager.transition(updated, 'executing');
      updated = manager.transition(updated, 'analyzing');
      
      expect(updated.metadata.phaseHistory).toHaveLength(3);
      expect(updated.metadata.phaseHistory.map(h => h.phase)).toEqual([
        'planning',
        'executing',
        'analyzing',
      ]);
    });
    
    it('should record transition timestamps', () => {
      const state = manager.createState('conv_1');
      const updated = manager.transition(state, 'planning');
      
      const history = updated.metadata.phaseHistory[0];
      expect(history?.timestamp).toBeDefined();
      expect(new Date(history!.timestamp).getTime()).toBeGreaterThan(0);
    });
    
    it('should allow all valid transitions', () => {
      const phases: ConversationPhase[] = ['idle', 'planning', 'executing', 'analyzing', 'responding', 'completed', 'error'];
      
      phases.forEach(phase => {
        const state = manager.createState(`conv_${phase}`);
        const updated = manager.transition(state, phase);
        expect(updated.phase).toBe(phase);
      });
    });
  });
  
  describe('addMessage', () => {
    it('should add message to state', () => {
      const state = manager.createState('conv_1');
      const message = createMessage('user', 'Hello');
      
      const updated = manager.addMessage(state, message);
      
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toEqual(message);
      expect(updated.metadata.turnCount).toBe(1);
    });
    
    it('should increment turn count', () => {
      let state = manager.createState('conv_1');
      
      state = manager.addMessage(state, createMessage('user', 'First'));
      expect(state.metadata.turnCount).toBe(1);
      
      state = manager.addMessage(state, createMessage('assistant', 'Second'));
      expect(state.metadata.turnCount).toBe(2);
    });
    
    it('should update lastUpdated timestamp', () => {
      const state = manager.createState('conv_1');
      const originalUpdated = state.metadata.lastUpdated;
      
      // Small delay to ensure timestamp changes
      const updated = manager.addMessage(state, createMessage('user', 'Test'));
      
      expect(updated.metadata.lastUpdated).toBeDefined();
      // Timestamps should be close but updated one might be same or later
      expect(new Date(updated.metadata.lastUpdated).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdated).getTime()
      );
    });
  });
  
  describe('addEntity', () => {
    it('should add entity to state', () => {
      const state = manager.createState('conv_1');
      
      const updated = manager.addEntity(state, 'FacilityA');
      
      expect(updated.entities).toContain('FacilityA');
    });
    
    it('should deduplicate entities', () => {
      let state = manager.createState('conv_1');
      
      state = manager.addEntity(state, 'FacilityA');
      state = manager.addEntity(state, 'FacilityA');
      state = manager.addEntity(state, 'FacilityB');
      
      expect(state.entities).toHaveLength(2);
      expect(state.entities).toContain('FacilityA');
      expect(state.entities).toContain('FacilityB');
    });
  });
  
  describe('getCurrentPhase', () => {
    it('should return current phase', () => {
      const state = manager.createState('conv_1');
      const phase = manager.getCurrentPhase(state);
      
      expect(phase).toBe('idle');
    });
    
    it('should return updated phase after transition', () => {
      let state = manager.createState('conv_1');
      state = manager.transition(state, 'planning');
      
      const phase = manager.getCurrentPhase(state);
      expect(phase).toBe('planning');
    });
  });
  
  describe('getPhase Duration', () => {
    it('should calculate phase duration', () => {
      const state = manager.createState('conv_1');
      const updated = manager.transition(state, 'planning');
      
      const duration = manager.getPhaseDuration(updated, 'planning');
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should return 0 for phase not in history', () => {
      const state = manager.createState('conv_1');
      
      const duration = manager.getPhaseDuration(state, 'planning');
      
      expect(duration).toBe(0);
    });
  });
  
  describe('getConversationDuration', () => {
    it('should calculate total conversation duration', () => {
      const state = manager.createState('conv_1');
      
      const duration = manager.getConversationDuration(state);
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});

