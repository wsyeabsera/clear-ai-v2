/**
 * Context Management Types
 * Core type definitions for conversation context
 */

/**
 * Message roles in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Message metadata
 */
export interface MessageMetadata {
  priority?: 'low' | 'medium' | 'high';
  sticky?: boolean; // Never compress/remove
  toolName?: string;
  toolCallId?: string;
  importance?: number; // 0-1 score
  [key: string]: any; // Allow additional metadata
}

/**
 * A single message in the conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string; // ISO 8601 format
  metadata?: MessageMetadata;
  tokenCount?: number;
}

/**
 * Context window containing messages and metadata
 */
export interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  messages: Message[];
  compressed: boolean;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  startedAt: string;
  lastUpdated: string;
  turnCount: number;
  entities: string[];
}

/**
 * Type guard for MessageRole
 */
export function isValidMessageRole(role: any): role is MessageRole {
  return ['system', 'user', 'assistant', 'tool'].includes(role);
}

/**
 * Type guard for Message
 */
export function isValidMessage(message: any): message is Message {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  // Check required fields
  if (!isValidMessageRole(message.role)) {
    return false;
  }
  
  if (typeof message.content !== 'string') {
    return false;
  }
  
  if (typeof message.timestamp !== 'string') {
    return false;
  }
  
  // Validate timestamp format
  try {
    const date = new Date(message.timestamp);
    if (isNaN(date.getTime())) {
      return false;
    }
  } catch {
    return false;
  }
  
  // Optional fields validation
  if (message.tokenCount !== undefined && typeof message.tokenCount !== 'number') {
    return false;
  }
  
  if (message.metadata !== undefined && typeof message.metadata !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Create a new message
 */
export function createMessage(
  role: MessageRole,
  content: string,
  metadata?: MessageMetadata
): Message {
  return {
    role,
    content,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata }),
  };
}

/**
 * Calculate approximate token count for a message
 * Uses simple heuristic: ~1 token per 4 characters
 * This is a rough estimate; use proper token counter for accuracy
 */
export function calculateMessageTokens(message: Message): number {
  // Base tokens for message structure (role, formatting)
  const baseTokens = 4;
  
  // Content tokens (rough estimate)
  const contentTokens = Math.ceil(message.content.length / 4);
  
  // Role-specific tokens
  const roleTokens = message.role.length / 4;
  
  // Metadata tokens (if present)
  let metadataTokens = 0;
  if (message.metadata) {
    const metadataStr = JSON.stringify(message.metadata);
    metadataTokens = Math.ceil(metadataStr.length / 4);
  }
  
  return Math.ceil(baseTokens + contentTokens + roleTokens + metadataTokens);
}

