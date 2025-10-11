/**
 * Langfuse Tracer
 * Integration with Langfuse for LLM observability and tracing
 */

import { Langfuse } from 'langfuse';

/**
 * Tracer configuration
 */
export interface TracerConfig {
  enabled?: boolean;
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}

/**
 * Trace data
 */
export interface TraceData {
  id: string;
  _internal: any; // Internal Langfuse trace object
}

/**
 * Span data
 */
export interface SpanData {
  id: string;
  _internal: any; // Internal Langfuse span object
}

/**
 * Generation data
 */
export interface GenerationData {
  model: string;
  prompt: string;
  completion: string;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Langfuse Tracer
 * Provides observability for agent workflows
 */
export class LangfuseTracer {
  private client: Langfuse | null = null;
  private enabled: boolean;
  
  constructor(config: TracerConfig, mockClient?: any) {
    this.enabled = config.enabled ?? false;
    
    if (mockClient) {
      this.client = mockClient;
    } else if (this.enabled) {
      const langfuseConfig: any = {};
      
      const publicKey = config.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
      const secretKey = config.secretKey || process.env.LANGFUSE_SECRET_KEY;
      const baseUrl = config.baseUrl || process.env.LANGFUSE_BASE_URL;
      
      if (publicKey) langfuseConfig.publicKey = publicKey;
      if (secretKey) langfuseConfig.secretKey = secretKey;
      if (baseUrl) langfuseConfig.baseUrl = baseUrl;
      
      this.client = new Langfuse(langfuseConfig);
    }
  }
  
  /**
   * Start a new trace
   */
  startTrace(name: string, input: any, metadata?: Record<string, any>): TraceData {
    if (!this.enabled || !this.client) {
      return this.createDummyTrace();
    }
    
    const trace = this.client.trace({
      name,
      input,
      metadata,
    });
    
    return {
      id: (trace as any).id || `trace_${Date.now()}`,
      _internal: trace,
    };
  }
  
  /**
   * Start a span within a trace
   */
  startSpan(trace: TraceData, name: string, input?: any): SpanData {
    if (!this.enabled || !this.client || !trace._internal) {
      return this.createDummySpan();
    }
    
    const span = trace._internal.span({
      name,
      input,
    });
    
    return {
      id: (span as any).id || `span_${Date.now()}`,
      _internal: span,
    };
  }
  
  /**
   * Track an LLM generation
   */
  trackGeneration(trace: TraceData, name: string, data: GenerationData): any {
    if (!this.enabled || !this.client || !trace._internal) {
      return this.createDummyGeneration();
    }
    
    const generation = trace._internal.generation({
      name,
      model: data.model,
      input: data.prompt,
      output: data.completion,
      usage: data.usage,
    });
    
    return generation;
  }
  
  /**
   * End a trace
   */
  endTrace(trace: TraceData, output?: any): void {
    if (!this.enabled || !trace._internal || !trace._internal.end) {
      return;
    }
    
    trace._internal.update({ output });
    trace._internal.end();
  }
  
  /**
   * Add metadata to a trace
   */
  addMetadata(trace: TraceData, metadata: Record<string, any>): void {
    if (!this.enabled || !trace._internal || !trace._internal.update) {
      return;
    }
    
    trace._internal.update({ metadata });
  }
  
  /**
   * Flush pending events (useful for serverless)
   */
  async flush(): Promise<void> {
    if (this.enabled && this.client) {
      await this.client.flushAsync();
    }
  }
  
  /**
   * Shutdown tracer
   */
  async shutdown(): Promise<void> {
    if (this.enabled && this.client) {
      await this.client.shutdownAsync();
    }
  }
  
  /**
   * Create dummy trace for when tracing is disabled
   */
  private createDummyTrace(): TraceData {
    return {
      id: 'dummy',
      _internal: {
        update: () => {},
        span: () => this.createDummySpan()._internal,
        generation: () => this.createDummyGeneration(),
        end: () => {},
      },
    };
  }
  
  /**
   * Create dummy span for when tracing is disabled
   */
  private createDummySpan(): SpanData {
    return {
      id: 'dummy',
      _internal: {
        update: () => {},
        end: () => {},
      },
    };
  }
  
  /**
   * Create dummy generation for when tracing is disabled
   */
  private createDummyGeneration(): any {
    return {
      id: 'dummy',
      update: () => {},
      end: () => {},
    };
  }
}

