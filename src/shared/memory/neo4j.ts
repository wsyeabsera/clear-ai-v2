/**
 * Neo4j Episodic Memory Implementation
 * Stores structured events, relationships, and temporal data
 */

import neo4j, { Driver, Session, auth } from 'neo4j-driver';
import { EpisodicEvent, EpisodicQuery } from '../types/memory.js';
import { Neo4jConfig } from '../types/common.js';
import { MemoryError } from '../utils/errors.js';

export class Neo4jMemory {
  private driver: Driver | null = null;
  private config: Neo4jConfig;
  
  /**
   * @param config - Neo4j configuration
   * @param mockDriver - Optional mock driver for testing (dependency injection)
   */
  constructor(config: Neo4jConfig, mockDriver?: any) {
    this.config = config;
    if (mockDriver) {
      this.driver = mockDriver;
    }
  }
  
  /**
   * Connect to Neo4j database
   */
  async connect(): Promise<void> {
    // Skip if mock driver already injected
    if (this.driver) {
      return;
    }
    
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        auth.basic(this.config.user, this.config.password)
      );
      
      // Verify connectivity
      await this.driver.verifyConnectivity();
    } catch (error: any) {
      throw new MemoryError(
        'connect',
        `Failed to connect to Neo4j: ${error.message}`,
        { uri: this.config.uri, error: error.message }
      );
    }
  }
  
  /**
   * Close connection to Neo4j
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }
  
  /**
   * Store an episodic event
   */
  async storeEvent(event: EpisodicEvent): Promise<void> {
    this.ensureConnected();
    
    const session: Session = this.driver!.session();
    
    try {
      // Create event node
      await session.run(
        `
        CREATE (e:Event {
          id: $id,
          type: $type,
          timestamp: datetime($timestamp),
          data: $data
        })
        `,
        {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          data: JSON.stringify(event.data),
        }
      );
      
      // Create relationships if provided
      if (event.relationships) {
        // CAUSED_BY relationships
        if (event.relationships.caused_by) {
          for (const causedBy of event.relationships.caused_by) {
            await session.run(
              `
              MATCH (e1:Event {id: $id1}), (e2:Event {id: $id2})
              CREATE (e1)-[:CAUSED_BY]->(e2)
              `,
              { id1: event.id, id2: causedBy }
            );
          }
        }
        
        // LED_TO relationships
        if (event.relationships.led_to) {
          for (const ledTo of event.relationships.led_to) {
            await session.run(
              `
              MATCH (e1:Event {id: $id1}), (e2:Event {id: $id2})
              CREATE (e1)-[:LED_TO]->(e2)
              `,
              { id1: event.id, id2: ledTo }
            );
          }
        }
        
        // RELATES_TO relationships
        if (event.relationships.relates_to) {
          for (const relatesTo of event.relationships.relates_to) {
            await session.run(
              `
              MATCH (e1:Event {id: $id1}), (e2:Event {id: $id2})
              CREATE (e1)-[:RELATES_TO]->(e2)
              `,
              { id1: event.id, id2: relatesTo }
            );
          }
        }
      }
    } catch (error: any) {
      throw new MemoryError(
        'storeEvent',
        `Failed to store event: ${error.message}`,
        { eventId: event.id, error: error.message }
      );
    } finally {
      await session.close();
    }
  }
  
  /**
   * Query episodic events
   */
  async queryEvents(query: EpisodicQuery): Promise<EpisodicEvent[]> {
    this.ensureConnected();
    
    const session: Session = this.driver!.session();
    
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const params: Record<string, any> = {};
      
      if (query.type) {
        conditions.push('e.type = $type');
        params.type = query.type;
      }
      
      if (query.date_from) {
        conditions.push('e.timestamp >= datetime($date_from)');
        params.date_from = query.date_from;
      }
      
      if (query.date_to) {
        conditions.push('e.timestamp <= datetime($date_to)');
        params.date_to = query.date_to;
      }
      
      if (query.entity_ids && query.entity_ids.length > 0) {
        conditions.push('e.id IN $entity_ids');
        params.entity_ids = query.entity_ids;
      }
      
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';
      
      params.limit = query.limit || 10;
      
      // Execute query
      const result = await session.run(
        `
        MATCH (e:Event)
        ${whereClause}
        RETURN e
        ORDER BY e.timestamp DESC
        LIMIT $limit
        `,
        params
      );
      
      // Parse results
      const events: EpisodicEvent[] = result.records.map(record => {
        const node = record.get('e').properties;
        return {
          id: node.id,
          type: node.type,
          timestamp: node.timestamp.toString(),
          data: JSON.parse(node.data),
        };
      });
      
      // Fetch relationships for each event
      for (const event of events) {
        const relationships = await this.getEventRelationships(session, event.id);
        if (relationships) {
          event.relationships = relationships;
        }
      }
      
      return events;
    } catch (error: any) {
      throw new MemoryError(
        'queryEvents',
        `Failed to query events: ${error.message}`,
        { query, error: error.message }
      );
    } finally {
      await session.close();
    }
  }
  
  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<EpisodicEvent | null> {
    this.ensureConnected();
    
    const session: Session = this.driver!.session();
    
    try {
      const result = await session.run(
        `
        MATCH (e:Event {id: $id})
        RETURN e
        `,
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0]!.get('e').properties;
      const event: EpisodicEvent = {
        id: node.id,
        type: node.type,
        timestamp: node.timestamp.toString(),
        data: JSON.parse(node.data),
      };
      
      // Get relationships
      const relationships = await this.getEventRelationships(session, id);
      if (relationships) {
        event.relationships = relationships;
      }
      
      return event;
    } catch (error: any) {
      throw new MemoryError(
        'getEvent',
        `Failed to get event: ${error.message}`,
        { id, error: error.message }
      );
    } finally {
      await session.close();
    }
  }
  
  /**
   * Get relationships for an event
   */
  private async getEventRelationships(
    session: Session,
    eventId: string
  ): Promise<{ caused_by?: string[]; led_to?: string[]; relates_to?: string[] } | null> {
    try {
      const result = await session.run(
        `
        MATCH (e:Event {id: $id})
        OPTIONAL MATCH (e)-[:CAUSED_BY]->(cb:Event)
        OPTIONAL MATCH (e)-[:LED_TO]->(lt:Event)
        OPTIONAL MATCH (e)-[:RELATES_TO]->(rt:Event)
        RETURN 
          collect(DISTINCT cb.id) as caused_by,
          collect(DISTINCT lt.id) as led_to,
          collect(DISTINCT rt.id) as relates_to
        `,
        { id: eventId }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0]!;
      const causedBy = record.get('caused_by').filter((id: string) => id);
      const ledTo = record.get('led_to').filter((id: string) => id);
      const relatesTo = record.get('relates_to').filter((id: string) => id);
      
      const relationships: any = {};
      if (causedBy.length > 0) relationships.caused_by = causedBy;
      if (ledTo.length > 0) relationships.led_to = ledTo;
      if (relatesTo.length > 0) relationships.relates_to = relatesTo;
      
      return Object.keys(relationships).length > 0 ? relationships : null;
    } catch (error) {
      // Return null on error, don't fail the whole query
      return null;
    }
  }
  
  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    this.ensureConnected();
    
    const session: Session = this.driver!.session();
    
    try {
      await session.run(
        `
        MATCH (e:Event {id: $id})
        DETACH DELETE e
        `,
        { id }
      );
    } catch (error: any) {
      throw new MemoryError(
        'deleteEvent',
        `Failed to delete event: ${error.message}`,
        { id, error: error.message }
      );
    } finally {
      await session.close();
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.driver !== null;
  }
  
  /**
   * Ensure connection is established
   */
  private ensureConnected(): void {
    if (!this.driver) {
      throw new MemoryError(
        'connection',
        'Not connected to Neo4j. Call connect() first.',
        {}
      );
    }
  }
}

