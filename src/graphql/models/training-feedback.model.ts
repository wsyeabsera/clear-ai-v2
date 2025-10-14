/**
 * MongoDB Training Feedback Model
 * Schema for storing user feedback for agent training
 */

import mongoose, { Document, Schema } from 'mongoose';
import { AgentType, FeedbackRating, FeedbackIssue } from '../../shared/types/training.js';

export interface ITrainingFeedbackDocument extends Document {
  id: string;
  requestId: string;
  configId: string;
  agentType: AgentType;
  rating: FeedbackRating;
  issues: FeedbackIssue[];
  suggestions: string[];
  metadata: {
    query?: string;
    responseTime?: number;
    confidence?: number;
    qualityScore?: number;
    userAgent?: string;
    sessionId?: string;
  };
  createdAt: Date;
}

const feedbackRatingSchema = new Schema({
  overall: { type: Number, required: true, min: 1, max: 5 },
  accuracy: { type: Number, min: 1, max: 5 },
  relevance: { type: Number, min: 1, max: 5 },
  clarity: { type: Number, min: 1, max: 5 },
  actionability: { type: Number, min: 1, max: 5 }
}, { _id: false });

const feedbackIssueSchema = new Schema({
  type: {
    type: String,
    enum: ['accuracy', 'relevance', 'clarity', 'completeness', 'actionability', 'tone'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  description: { type: String, required: true },
  suggestion: { type: String }
}, { _id: false });

const feedbackMetadataSchema = new Schema({
  query: { type: String },
  responseTime: { type: Number },
  confidence: { type: Number },
  qualityScore: { type: Number },
  userAgent: { type: String },
  sessionId: { type: String }
}, { _id: false });

const trainingFeedbackSchema = new Schema<ITrainingFeedbackDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  requestId: {
    type: String,
    required: true,
    index: true
  },
  configId: {
    type: String,
    required: true,
    index: true
  },
  agentType: {
    type: String,
    enum: ['analyzer', 'summarizer'],
    required: true,
    index: true
  },
  rating: {
    type: feedbackRatingSchema,
    required: true
  },
  issues: [feedbackIssueSchema],
  suggestions: [{ type: String }],
  metadata: {
    type: feedbackMetadataSchema,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We only want createdAt, not updatedAt
});

// Indexes for better query performance
trainingFeedbackSchema.index({ configId: 1, agentType: 1 });
trainingFeedbackSchema.index({ configId: 1, createdAt: -1 });
trainingFeedbackSchema.index({ 'rating.overall': 1 });
trainingFeedbackSchema.index({ createdAt: -1 });
trainingFeedbackSchema.index({ requestId: 1 });

// Pre-save middleware to generate UUID if not provided
trainingFeedbackSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

export const TrainingFeedbackModel = mongoose.model<ITrainingFeedbackDocument>('TrainingFeedback', trainingFeedbackSchema);
