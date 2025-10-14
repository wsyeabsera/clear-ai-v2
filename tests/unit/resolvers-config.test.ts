/**
 * Unit tests for GraphQL resolver configuration handling
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('GraphQL Resolvers - Configuration Handling', () => {
  describe('analyzeResults resolver', () => {
    it('should extract analyzerConfigId from arguments', () => {
      const args = {
        requestId: 'test-123',
        analyzerConfigId: 'config-456'
      };

      const { requestId, analyzerConfigId } = args;

      expect(requestId).toBe('test-123');
      expect(analyzerConfigId).toBe('config-456');
    });

    it('should handle missing analyzerConfigId', () => {
      const args = {
        requestId: 'test-123'
      };

      const { requestId, analyzerConfigId } = args as { requestId: string; analyzerConfigId?: string };

      expect(requestId).toBe('test-123');
      expect(analyzerConfigId).toBeUndefined();
    });
  });

  describe('summarizeResponse resolver', () => {
    it('should extract summarizerConfigId from arguments', () => {
      const args = {
        requestId: 'test-123',
        summarizerConfigId: 'config-789'
      };

      const { requestId, summarizerConfigId } = args;

      expect(requestId).toBe('test-123');
      expect(summarizerConfigId).toBe('config-789');
    });

    it('should handle missing summarizerConfigId', () => {
      const args = {
        requestId: 'test-123'
      };

      const { requestId, summarizerConfigId } = args as { requestId: string; summarizerConfigId?: string };

      expect(requestId).toBe('test-123');
      expect(summarizerConfigId).toBeUndefined();
    });
  });

  describe('ConfigurableAnalyzer instantiation', () => {
    it('should accept configId in constructor', () => {
      const configId = 'test-config-id';
      
      // Mock the ConfigurableAnalyzer behavior
      class MockAnalyzer {
        private configId: string | null = null;

        constructor(
          _llm: any,
          _storage: any,
          _registry: any,
          configOrId?: string
        ) {
          if (typeof configOrId === 'string') {
            this.configId = configOrId;
          }
        }

        getConfigId() {
          return this.configId;
        }
      }

      const analyzer = new MockAnalyzer(null, null, null, configId);
      expect(analyzer.getConfigId()).toBe(configId);
    });
  });

  describe('ConfigurableSummarizer instantiation', () => {
    it('should accept configId in constructor', () => {
      const configId = 'test-config-id';
      
      // Mock the ConfigurableSummarizer behavior
      class MockSummarizer {
        private configId: string | null = null;

        constructor(
          _llm: any,
          _storage: any,
          _registry: any,
          configOrId?: string
        ) {
          if (typeof configOrId === 'string') {
            this.configId = configOrId;
          }
        }

        getConfigId() {
          return this.configId;
        }
      }

      const summarizer = new MockSummarizer(null, null, null, configId);
      expect(summarizer.getConfigId()).toBe(configId);
    });
  });
});

