# Memory System Blueprint

## Overview
The Memory System provides both episodic (Neo4j) and semantic (Pinecone) memory capabilities, allowing the system to learn from past interactions and retrieve relevant context.

## Components

### 1. Neo4j (Episodic Memory)
Stores structured events, relationships, and temporal data.

### 2. Pinecone (Semantic Memory)
Stores vector embeddings for similarity search.

### 3. Memory Manager
Unified interface for both memory systems.

## Architecture

```typescript
// src/memory/types.ts
export interface EpisodicEvent {
  id: string;
  type: 'request' | 'tool_call' | 'insight' | 'error';
  timestamp: string;
  data: any;
  relationships?: {
    caused_by?: string[];
    led_to?: string[];
    relates_to?: string[];
  };
}

export interface SemanticRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// src/memory/neo4j.ts
import neo4j, { Driver, Session } from 'neo4j-driver';

export class Neo4jMemory {
  private driver: Driver;
  
  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password)
    );
  }
  
  async storeEvent(event: EpisodicEvent): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(`
        CREATE (e:Event {
          id: $id,
          type: $type,
          timestamp: datetime($timestamp),
          data: $data
        })
      `, {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: JSON.stringify(event.data)
      });
      
      // Create relationships if provided
      if (event.relationships) {
        for (const causedBy of event.relationships.caused_by || []) {
          await session.run(`
            MATCH (e1:Event {id: $id1}), (e2:Event {id: $id2})
            CREATE (e1)-[:CAUSED_BY]->(e2)
          `, { id1: event.id, id2: causedBy });
        }
      }
    } finally {
      await session.close();
    }
  }
  
  async queryEvents(query: {
    type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<EpisodicEvent[]> {
    const session = this.driver.session();
    
    try {
      const cypherQuery = `
        MATCH (e:Event)
        ${query.type ? 'WHERE e.type = $type' : ''}
        ${query.date_from ? 'AND e.timestamp >= datetime($date_from)' : ''}
        ${query.date_to ? 'AND e.timestamp <= datetime($date_to)' : ''}
        RETURN e
        ORDER BY e.timestamp DESC
        LIMIT $limit
      `;
      
      const result = await session.run(cypherQuery, {
        type: query.type,
        date_from: query.date_from,
        date_to: query.date_to,
        limit: query.limit || 10
      });
      
      return result.records.map(record => {
        const node = record.get('e').properties;
        return {
          id: node.id,
          type: node.type,
          timestamp: node.timestamp.toString(),
          data: JSON.parse(node.data)
        };
      });
    } finally {
      await session.close();
    }
  }
  
  async close(): Promise<void> {
    await this.driver.close();
  }
}

// src/memory/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export class PineconeMemory {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  
  constructor(apiKey: string, environment: string, indexName: string) {
    this.pinecone = new Pinecone({
      apiKey,
      environment
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.indexName = indexName;
  }
  
  async store(
    text: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const embedding = await this.generateEmbedding(text);
    const id = crypto.randomUUID();
    
    const index = this.pinecone.index(this.indexName);
    await index.upsert([{
      id,
      values: embedding,
      metadata: {
        text,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    }]);
  }
  
  async search(
    query: string,
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<any[]> {
    const embedding = await this.generateEmbedding(query);
    
    const index = this.pinecone.index(this.indexName);
    const results = await index.query({
      vector: embedding,
      topK,
      filter,
      includeMetadata: true
    });
    
    return results.matches?.map(match => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text,
      metadata: match.metadata
    })) || [];
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    
    return response.data[0].embedding;
  }
}

// src/memory/manager.ts
import { Neo4jMemory } from './neo4j.js';
import { PineconeMemory } from './pinecone.js';
import { EpisodicEvent } from './types.js';

export class MemoryManager {
  constructor(
    private neo4j: Neo4jMemory,
    private pinecone: PineconeMemory
  ) {}
  
  async storeEpisodic(event: EpisodicEvent): Promise<void> {
    await this.neo4j.storeEvent(event);
  }
  
  async queryEpisodic(query: any): Promise<any[]> {
    return this.neo4j.queryEvents(query);
  }
  
  async storeSemantic(
    text: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await this.pinecone.store(text, metadata);
  }
  
  async querySemantic(
    query: string,
    topK: number = 5
  ): Promise<any[]> {
    return this.pinecone.search(query, topK);
  }
  
  async close(): Promise<void> {
    await this.neo4j.close();
  }
}
```

## Configuration

```typescript
// src/config/memory.config.ts
export const memoryConfig = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || ''
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX || 'clear-ai-v2'
  }
};
```

## Usage

```typescript
import { MemoryManager } from './memory/manager.js';
import { Neo4jMemory } from './memory/neo4j.js';
import { PineconeMemory } from './memory/pinecone.js';
import { memoryConfig } from './config/memory.config.js';

// Initialize
const neo4j = new Neo4jMemory(
  memoryConfig.neo4j.uri,
  memoryConfig.neo4j.user,
  memoryConfig.neo4j.password
);

const pinecone = new PineconeMemory(
  memoryConfig.pinecone.apiKey,
  memoryConfig.pinecone.environment,
  memoryConfig.pinecone.indexName
);

const memory = new MemoryManager(neo4j, pinecone);

// Store episodic event
await memory.storeEpisodic({
  id: 'req_123',
  type: 'request',
  timestamp: new Date().toISOString(),
  data: { query: 'test', results: [] }
});

// Store semantic memory
await memory.storeSemantic(
  'Found 5 contaminated shipments in Hannover',
  { requestId: 'req_123', toolsUsed: ['shipments'] }
);

// Query similar past queries
const similar = await memory.querySemantic(
  'contaminated shipments Hannover',
  3
);

// Query related events
const events = await memory.queryEpisodic({
  type: 'request',
  date_from: '2025-10-01',
  limit: 10
});
```

