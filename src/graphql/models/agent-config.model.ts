/**
 * MongoDB Agent Config Model
 * Schema for storing configurable agent configurations
 */

import mongoose, { Document, Schema } from 'mongoose';
import { AgentType, AgentConfigData } from '../../shared/types/agent-config.js';

export interface IAgentConfigDocument extends Document {
  id: string;
  name: string;
  version: number;
  type: AgentType;
  isDefault: boolean;
  isActive: boolean;
  config: AgentConfigData;
  metadata: {
    createdBy?: string;
    description?: string;
    tags?: string[];
    performanceMetrics?: {
      avgConfidence: number;
      avgQualityScore: number;
      totalUsage: number;
      lastUsed?: Date;
      successRate?: number;
    };
    version?: string;
    isSystemDefault?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const performanceMetricsSchema = new Schema({
  avgConfidence: { type: Number, default: 0 },
  avgQualityScore: { type: Number, default: 0 },
  totalUsage: { type: Number, default: 0 },
  lastUsed: { type: Date },
  successRate: { type: Number, default: 0 }
}, { _id: false });

const metadataSchema = new Schema({
  createdBy: { type: String },
  description: { type: String },
  tags: [{ type: String }],
  performanceMetrics: performanceMetricsSchema,
  version: { type: String },
  isSystemDefault: { type: Boolean, default: false }
}, { _id: false });

const agentConfigSchema = new Schema<IAgentConfigDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  type: {
    type: String,
    enum: ['analyzer', 'summarizer'],
    required: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  config: {
    type: Schema.Types.Mixed,
    required: true
  },
  metadata: {
    type: metadataSchema,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
agentConfigSchema.index({ type: 1, isActive: 1 });
agentConfigSchema.index({ type: 1, isDefault: 1 });
agentConfigSchema.index({ 'metadata.tags': 1 });
agentConfigSchema.index({ createdAt: -1 });
agentConfigSchema.index({ 'metadata.performanceMetrics.totalUsage': -1 });

// Ensure only one default config per type
agentConfigSchema.index({ type: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

// Pre-save middleware to generate UUID if not provided
agentConfigSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

export const AgentConfigModel = mongoose.model<IAgentConfigDocument>('AgentConfig', agentConfigSchema);
