/**
 * Mock implementations for memory system testing
 */

/**
 * Mock Neo4j Driver for testing
 */
export class MockNeo4jDriver {
  private mockEvents: Map<string, any> = new Map();
  private sessionCalls: any[] = [];
  
  session(): MockNeo4jSession {
    const session = new MockNeo4jSession(this.mockEvents);
    this.sessionCalls.push(session);
    return session;
  }
  
  async verifyConnectivity(): Promise<void> {
    return Promise.resolve();
  }
  
  async close(): Promise<void> {
    this.mockEvents.clear();
    this.sessionCalls = [];
  }
  
  // Test helper methods
  getStoredEvents(): Map<string, any> {
    return this.mockEvents;
  }
  
  getSessionCalls(): any[] {
    return this.sessionCalls;
  }
}

/**
 * Mock Neo4j Session for testing
 */
export class MockNeo4jSession {
  private runCalls: any[] = [];
  
  constructor(private events: Map<string, any>) {}
  
  async run(query: string, params?: any): Promise<any> {
    this.runCalls.push({ query, params });
    
    // Parse query type
    if (query.includes('CREATE (e:Event')) {
      // Store event
      this.events.set(params.id, {
        id: params.id,
        type: params.type,
        timestamp: params.timestamp,
        data: params.data,
      });
      return { records: [] };
    }
    
    if (query.includes('MATCH (e:Event)') && query.includes('RETURN e')) {
      // Query events
      const records = Array.from(this.events.values())
        .filter(event => {
          if (params.type && event.type !== params.type) return false;
          return true;
        })
        .slice(0, params.limit || 10)
        .map(event => ({
          get: (_key: string) => ({
            properties: event,
          }),
        }));
      
      return { records };
    }
    
    if (query.includes('MATCH (e:Event {id:')) {
      // Get single event
      const event = this.events.get(params.id);
      if (!event) {
        return { records: [] };
      }
      
      return {
        records: [{
          get: (_key: string) => ({
            properties: event,
          }),
        }],
      };
    }
    
    if (query.includes('DETACH DELETE')) {
      // Delete event
      this.events.delete(params.id);
      return { records: [] };
    }
    
    if (query.includes('OPTIONAL MATCH') && query.includes('CAUSED_BY')) {
      // Get relationships
      return {
        records: [{
          get: (key: string) => {
            if (key === 'caused_by') return [];
            if (key === 'led_to') return [];
            if (key === 'relates_to') return [];
            return [];
          },
        }],
      };
    }
    
    // Default empty response
    return { records: [] };
  }
  
  async close(): Promise<void> {
    return Promise.resolve();
  }
  
  // Test helper
  getRunCalls(): any[] {
    return this.runCalls;
  }
}

/**
 * Mock Pinecone Index for testing
 */
export class MockPineconeIndex {
  private vectors: Map<string, any> = new Map();
  
  async upsert(vectors: any[]): Promise<void> {
    vectors.forEach(vector => {
      this.vectors.set(vector.id, vector);
    });
  }
  
  async query(options: any): Promise<any> {
    // Simple mock: return all vectors sorted by a fake score
    const matches = Array.from(this.vectors.values())
      .filter(vector => {
        // Apply filter if provided
        if (options.filter) {
          for (const [key, value] of Object.entries(options.filter)) {
            if (vector.metadata?.[key] !== value) return false;
          }
        }
        return true;
      })
      .slice(0, options.topK || 5)
      .map((vector, index) => ({
        id: vector.id,
        score: 0.9 - (index * 0.1), // Decreasing scores
        metadata: vector.metadata,
      }));
    
    return { matches };
  }
  
  async fetch(ids: string[]): Promise<any> {
    const records: any = {};
    
    ids.forEach(id => {
      const vector = this.vectors.get(id);
      if (vector) {
        records[id] = vector;
      }
    });
    
    return { records };
  }
  
  async deleteOne(id: string): Promise<void> {
    this.vectors.delete(id);
  }
  
  async deleteMany(ids: string[]): Promise<void> {
    ids.forEach(id => this.vectors.delete(id));
  }
  
  async describeIndexStats(): Promise<any> {
    return {
      dimension: 1536,
      indexFullness: 0,
      totalVectorCount: this.vectors.size,
    };
  }
  
  // Test helper
  getVectors(): Map<string, any> {
    return this.vectors;
  }
}

/**
 * Mock Pinecone Client for testing
 */
export class MockPineconeClient {
  private indexes: Map<string, MockPineconeIndex> = new Map();
  
  index(name: string): MockPineconeIndex {
    if (!this.indexes.has(name)) {
      this.indexes.set(name, new MockPineconeIndex());
    }
    return this.indexes.get(name)!;
  }
  
  // Test helper
  getIndex(name: string): MockPineconeIndex | undefined {
    return this.indexes.get(name);
  }
}

/**
 * Mock OpenAI Client for testing
 */
export class MockOpenAIClient {
  embeddings = {
    create: async (_params: any): Promise<any> => {
      // Generate fake embedding
      const embedding = new Array(1536).fill(0).map(() => Math.random());
      
      return {
        data: [{ embedding }],
      };
    },
  };
}

/**
 * Mock Embedding Service for testing
 */
export class MockEmbeddingService {
  private dimensions: number;
  
  constructor(dimensions: number = 768) {
    this.dimensions = dimensions;
  }
  
  async generate(_text: string): Promise<number[]> {
    // Generate fake embedding
    return new Array(this.dimensions).fill(0).map(() => Math.random());
  }
  
  getDimensions(): number {
    return this.dimensions;
  }
  
  getProvider(): 'ollama' | 'openai' {
    return 'ollama';
  }
}

