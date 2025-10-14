/**
 * MongoDB Analysis Model
 * Schema for storing analysis results from the Analyzer Agent
 */

import mongoose, { Document, Schema } from 'mongoose';
import { Analysis } from '../../shared/types/agent.js';

export interface IAnalysisDocument extends Document {
  requestId: string;
  query: string;
  analysis: Analysis;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const analysisSchema = new Schema<IAnalysisDocument>({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  query: {
    type: String,
    required: true
  },
  analysis: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
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
analysisSchema.index({ requestId: 1 });
analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ createdAt: -1, status: 1 });

export const AnalysisModel = mongoose.model<IAnalysisDocument>('Analysis', analysisSchema);
