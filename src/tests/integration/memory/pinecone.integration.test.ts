/**
 * Pinecone Memory Integration Tests
 * Tests real Pinecone operations with Ollama embeddings
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { PineconeMemory } from '../../../shared/memory/pinecone.js';
import { createEmbeddingService, loadEmbeddingConfig } from '../../../shared/memory/embeddings.js';

// Load environment variables
dotenv.config();

// Check if Ollama is running
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Check if Pinecone is configured
function isPineconeConfigured(): boolean {
  return !!(
    process.env.PINECONE_API_KEY &&
    process.env.PINECONE_INDEX
  );
}

const ollamaAvailable = await isOllamaAvailable();
const pineconeConfigured = isPineconeConfigured();
const allReady = ollamaAvailable && pineconeConfigured;

const describeIfReady = allReady ? describe : describe.skip;

describeIfReady('Pinecone Memory Integration', () => {
  let memory: PineconeMemory;
  
  beforeAll(async () => {
    if (!allReady) {
      if (!ollamaAvailable) {
        console.log('⚠️  Ollama not available, skipping Pinecone integration tests');
      }
      if (!pineconeConfigured) {
        console.log('⚠️  Pinecone not configured, skipping Pinecone integration tests');
      }
      return;
    }
    
    const embeddingConfig = loadEmbeddingConfig();
    const embeddingService = createEmbeddingService(embeddingConfig);
    
    memory = new PineconeMemory(
      {
        api_key: process.env.PINECONE_API_KEY!,
        environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
        index_name: process.env.PINECONE_INDEX!,
      },
      embeddingService
    );
    
    await memory.connect();
  });
  
  afterAll(async () => {
    if (memory && memory.isConnected()) {
      // Clean up test records
      await cleanupTestRecords();
      await memory.close();
    }
  });
  
  beforeEach(async () => {
    // Clean up test records before each test
    await cleanupTestRecords();
  });
  
  /**
   * Helper to clean up test records
   */
  async function cleanupTestRecords(): Promise<void> {
    if (!memory || !memory.isConnected()) {
      return;
    }
    
    try {
      // Query all test records
      const results = await memory.search({
        query: 'test cleanup',
        top_k: 100,
        filter: {
          test: { $eq: true },
        },
      });
      
      // Delete them
      if (results.length > 0) {
        const ids = results.map(r => r.id);
        await memory.deleteMany(ids);
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup warning:', error);
    }
  }
  
  describe('Real Pinecone Operations with Ollama Embeddings', () => {
    it('should store and retrieve a record', async () => {
      const text = 'This is a test record for integration testing';
      const metadata = {
        type: 'test',
        test: true,
      };
      
      const id = await memory.store(text, metadata, 'test_record_1');
      
      expect(id).toBe('test_record_1');
      
      const retrieved = await memory.get('test_record_1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.text).toBe(text);
      expect(retrieved?.metadata.type).toBe('test');
    }, 30000);
    
    it('should perform semantic similarity search', async () => {
      // Store related records
      await memory.store(
        'Shipment of plastic waste was delivered successfully',
        { type: 'success', test: true },
        'test_record_2'
      );
      
      await memory.store(
        'Contaminants detected in metal recycling batch',
        { type: 'alert', test: true },
        'test_record_3'
      );
      
      await memory.store(
        'Facility inspection completed without issues',
        { type: 'inspection', test: true },
        'test_record_4'
      );
      
      // Search for similar records
      const results = await memory.search({
        query: 'successful delivery of waste shipment',
        top_k: 3,
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.score).toBeGreaterThan(0);
      
      // Most similar should be about shipment delivery
      const topResult = results[0];
      expect(topResult?.text).toContain('Shipment');
    }, 30000);
    
    it('should handle metadata filtering', async () => {
      await memory.store(
        'Alert: High contamination level detected',
        { type: 'alert', severity: 'high', test: true },
        'test_record_5'
      );
      
      await memory.store(
        'Info: Regular shipment processed',
        { type: 'info', severity: 'low', test: true },
        'test_record_6'
      );
      
      // Search with filter
      const results = await memory.search({
        query: 'shipment information',
        top_k: 5,
        filter: {
          type: { $eq: 'alert' },
          test: { $eq: true },
        },
      });
      
      // Should only return alert records
      expect(results.every(r => r.metadata.type === 'alert')).toBe(true);
    }, 30000);
    
    it('should delete records', async () => {
      await memory.store(
        'This record will be deleted',
        { test: true },
        'test_record_7'
      );
      
      let record = await memory.get('test_record_7');
      expect(record).toBeDefined();
      
      await memory.delete('test_record_7');
      
      record = await memory.get('test_record_7');
      expect(record).toBeNull();
    }, 30000);
    
    it('should get index statistics', async () => {
      const stats = await memory.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.dimension).toBe('number');
      expect(typeof stats.totalVectorCount).toBe('number');
    }, 10000);
    
    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        memory.store(
          `Concurrent test record ${i}`,
          { index: i, test: true },
          `test_record_concurrent_${i}`
        )
      );
      
      const ids = await Promise.all(promises);
      
      expect(ids.length).toBe(5);
      expect(ids).toEqual([
        'test_record_concurrent_0',
        'test_record_concurrent_1',
        'test_record_concurrent_2',
        'test_record_concurrent_3',
        'test_record_concurrent_4',
      ]);
    }, 30000);
  });
});

