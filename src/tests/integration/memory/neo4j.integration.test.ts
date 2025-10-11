/**
 * Neo4j Memory Integration Tests
 * Tests real Neo4j database operations
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { Neo4jMemory } from '../../../shared/memory/neo4j.js';
import { EpisodicEvent, EventType } from '../../../shared/types/memory.js';

// Load environment variables
dotenv.config();

// Check if Neo4j is available
async function isNeo4jAvailable(): Promise<boolean> {
  try {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || '';
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await driver.verifyConnectivity();
    await driver.close();
    return true;
  } catch {
    return false;
  }
}

const neo4jAvailable = await isNeo4jAvailable();
const describeIfNeo4j = neo4jAvailable ? describe : describe.skip;

describeIfNeo4j('Neo4j Memory Integration', () => {
  let memory: Neo4jMemory;
  
  beforeAll(async () => {
    if (!neo4jAvailable) {
      console.log('⚠️  Neo4j not available, skipping Neo4j integration tests');
      return;
    }
    
    memory = new Neo4jMemory({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
    });
    
    await memory.connect();
  });
  
  afterAll(async () => {
    if (memory && memory.isConnected()) {
      await memory.close();
    }
  });
  
  beforeEach(async () => {
    // Clean up test events before each test
    await cleanupTestEvents();
  });
  
  /**
   * Helper to clean up test events
   */
  async function cleanupTestEvents(): Promise<void> {
    const query = `
      MATCH (e:Event)
      WHERE e.id STARTS WITH 'test_'
      DETACH DELETE e
    `;
    
    const driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || ''
      )
    );
    
    const session = driver.session();
    try {
      await session.run(query);
    } finally {
      await session.close();
      await driver.close();
    }
  }
  
  describe('Real Neo4j Operations', () => {
    it('should store and retrieve an event', async () => {
      const event: EpisodicEvent = {
        id: 'test_evt_1',
        type: 'tool_call' as EventType,
        timestamp: new Date().toISOString(),
        data: {
          tool: 'shipments',
          params: { status: 'delivered' },
          result: { count: 42 },
        },
      };
      
      await memory.storeEvent(event);
      
      const retrieved = await memory.getEvent('test_evt_1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test_evt_1');
      expect(retrieved?.type).toBe('tool_call');
      expect(retrieved?.data).toMatchObject(event.data);
    }, 10000);
    
    it('should store events with relationships', async () => {
      const event1: EpisodicEvent = {
        id: 'test_evt_2',
        type: 'tool_call' as EventType,
        timestamp: new Date().toISOString(),
        data: { tool: 'query' },
      };
      
      const event2: EpisodicEvent = {
        id: 'test_evt_3',
        type: 'insight' as EventType,
        timestamp: new Date().toISOString(),
        data: { insight: 'Found pattern' },
        relationships: {
          caused_by: ['test_evt_2'],
        },
      };
      
      await memory.storeEvent(event1);
      await memory.storeEvent(event2);
      
      const retrieved = await memory.getEvent('test_evt_3');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.relationships?.caused_by).toContain('test_evt_2');
    }, 10000);
    
    it('should query events by type', async () => {
      await memory.storeEvent({
        id: 'test_evt_4',
        type: 'tool_call' as EventType,
        timestamp: new Date().toISOString(),
        data: { tool: 'shipments' },
      });
      
      await memory.storeEvent({
        id: 'test_evt_5',
        type: 'insight' as EventType,
        timestamp: new Date().toISOString(),
        data: { insight: 'Pattern detected' },
      });
      
      const toolCalls = await memory.queryEvents({ type: 'tool_call' });
      
      expect(toolCalls.length).toBeGreaterThanOrEqual(1);
      expect(toolCalls.some(e => e.id === 'test_evt_4')).toBe(true);
    }, 10000);
    
    it('should query events by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      await memory.storeEvent({
        id: 'test_evt_6',
        type: 'tool_call' as EventType,
        timestamp: now.toISOString(),
        data: { tool: 'test' },
      });
      
      const events = await memory.queryEvents({
        date_from: yesterday.toISOString(),
        date_to: tomorrow.toISOString(),
      });
      
      expect(events.some(e => e.id === 'test_evt_6')).toBe(true);
    }, 10000);
    
    it('should delete events', async () => {
      await memory.storeEvent({
        id: 'test_evt_7',
        type: 'tool_call' as EventType,
        timestamp: new Date().toISOString(),
        data: { tool: 'test' },
      });
      
      let event = await memory.getEvent('test_evt_7');
      expect(event).toBeDefined();
      
      await memory.deleteEvent('test_evt_7');
      
      event = await memory.getEvent('test_evt_7');
      expect(event).toBeNull();
    }, 10000);
    
    it('should handle concurrent writes', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        memory.storeEvent({
          id: `test_evt_concurrent_${i}`,
          type: 'tool_call' as EventType,
          timestamp: new Date().toISOString(),
          data: { index: i },
        })
      );
      
      await Promise.all(promises);
      
      const events = await memory.queryEvents({ limit: 20 });
      const testEvents = events.filter(e => e.id.startsWith('test_evt_concurrent_'));
      
      expect(testEvents.length).toBe(10);
    }, 15000);
  });
});

