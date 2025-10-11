/**
 * Message Summarizer
 * Uses LLM to create concise summaries of conversation history
 */

import { Message, createMessage, calculateMessageTokens } from '../types.js';
import { LLMProvider } from '../../llm/provider.js';
import { EntityExtractor, ExtractedEntity } from './entity-extractor.js';

/**
 * Summarization result
 */
export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  entities: ExtractedEntity[];
  tokensSaved: number;
  originalTokens: number;
  summaryTokens: number;
}

/**
 * Message Summarizer
 * Compresses conversation history using LLM summarization
 */
export class MessageSummarizer {
  private llm: LLMProvider;
  private entityExtractor: EntityExtractor;
  private minMessagesToSummarize: number = 2;
  
  constructor(llm: LLMProvider, minMessages: number = 2) {
    this.llm = llm;
    this.minMessagesToSummarize = minMessages;
    this.entityExtractor = new EntityExtractor();
  }
  
  /**
   * Check if messages can be summarized
   */
  canSummarize(messages: Message[]): boolean {
    return messages.length >= this.minMessagesToSummarize;
  }
  
  /**
   * Summarize a list of messages
   */
  async summarize(messages: Message[]): Promise<SummarizationResult> {
    if (!this.canSummarize(messages)) {
      throw new Error(`Need at least ${this.minMessagesToSummarize} messages to summarize`);
    }
    
    // Calculate original token count
    const originalTokens = messages.reduce((sum, m) => 
      sum + (m.tokenCount || calculateMessageTokens(m)), 0
    );
    
    // Extract entities first
    const entities = this.entityExtractor.extractFromMessages(messages);
    
    // Build prompt for summarization
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    const prompt = `Summarize the following conversation concisely, preserving key information and entities:

${conversationText}

Provide:
1. A brief summary (2-3 sentences)
2. Key points (bullet points)

Format your response as:
SUMMARY: [your summary here]
KEY POINTS:
- [point 1]
- [point 2]
- [point 3]`;
    
    try {
      const response = await this.llm.generate({
        messages: [
          { role: 'user', content: prompt },
        ],
        config: {
          temperature: 0.3, // Low temperature for consistent summaries
          max_tokens: 500,
        },
      });
      
      // Parse response
      const { summary, keyPoints } = this.parseResponse(response.content);
      
      // Calculate tokens saved
      const summaryTokens = calculateMessageTokens(createMessage('system', summary));
      const tokensSaved = originalTokens - summaryTokens;
      
      return {
        summary,
        keyPoints,
        entities,
        tokensSaved,
        originalTokens,
        summaryTokens,
      };
    } catch (error: any) {
      throw new Error(`Failed to summarize messages: ${error.message}`);
    }
  }
  
  /**
   * Summarize messages and return as a single system message
   */
  async summarizeToMessage(messages: Message[]): Promise<Message> {
    const result = await this.summarize(messages);
    
    const summaryContent = `${result.summary}\n\nKey Points:\n${result.keyPoints.map(p => `- ${p}`).join('\n')}`;
    
    return createMessage('system', summaryContent, {
      compressed: true,
      sticky: true,
      originalCount: messages.length,
      tokensSaved: result.tokensSaved,
      entities: result.entities.map(e => e.value),
    });
  }
  
  /**
   * Parse LLM response to extract summary and key points
   */
  private parseResponse(content: string): { summary: string; keyPoints: string[] } {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    let summary = '';
    const keyPoints: string[] = [];
    let inKeyPoints = false;
    
    for (const line of lines) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8).trim();
      } else if (line === 'KEY POINTS:' || line === 'KEY POINTS') {
        inKeyPoints = true;
      } else if (inKeyPoints && line.startsWith('-')) {
        keyPoints.push(line.substring(1).trim());
      } else if (!inKeyPoints && !summary) {
        // If no SUMMARY: prefix, use first substantial line
        summary = line;
      }
    }
    
    // Fallback: use first part of content as summary
    if (!summary) {
      summary = content.substring(0, 200);
    }
    
    // Fallback: extract any bullet points as key points
    if (keyPoints.length === 0) {
      const bullets = content.match(/[-•]\s*(.+)/g);
      if (bullets) {
        keyPoints.push(...bullets.map(b => b.substring(1).trim()).slice(0, 5));
      }
    }
    
    return { summary, keyPoints };
  }
}

