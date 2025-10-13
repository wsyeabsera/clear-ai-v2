/**
 * MongoDB Execution Model
 * Schema for storing execution results from the Executor Agent
 */

import mongoose, { Document, Schema } from 'mongoose';
import { ToolResult } from '../../shared/types/agent.js';

export interface IExecutionDocument extends Document {
  requestId: string;
  results: ToolResult[];
  metadata: ExecutionMetadata;
  status: 'completed' | 'failed' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionMetadata {
  totalDurationMs: number;
  successfulSteps: number;
  failedSteps: number;
  timestamp: string;
}

const executionMetadataSchema = new Schema({
  totalDurationMs: {
    type: Number,
    required: true
  },
  successfulSteps: {
    type: Number,
    required: true
  },
  failedSteps: {
    type: Number,
    required: true
  },
  timestamp: {
    type: String,
    required: true
  }
}, { _id: false });

const executionSchema = new Schema<IExecutionDocument>({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  results: {
    type: Schema.Types.Mixed,
    required: true
  },
  metadata: {
    type: executionMetadataSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'partial'],
    default: 'completed'
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
executionSchema.index({ requestId: 1 });
executionSchema.index({ createdAt: -1 });
executionSchema.index({ status: 1 });
executionSchema.index({ createdAt: -1, status: 1 });

export const ExecutionModel = mongoose.model<IExecutionDocument>('Execution', executionSchema);
