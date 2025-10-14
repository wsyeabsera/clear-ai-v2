/**
 * Training Storage Service
 * Service layer for managing training feedback in MongoDB
 */

import { TrainingFeedback, CreateFeedbackInput, FeedbackFilters, FeedbackListResult, ConfigUpdate } from '../../shared/types/training.js';
import { TrainingFeedbackModel, ITrainingFeedbackDocument } from '../models/training-feedback.model.js';

export class TrainingStorageService {
  /**
   * Record training feedback
   */
  async recordFeedback(input: CreateFeedbackInput): Promise<TrainingFeedback> {
    try {
      const feedbackDoc = new TrainingFeedbackModel({
        id: this.generateId(),
        requestId: input.requestId,
        configId: input.configId,
        agentType: input.agentType,
        rating: input.rating,
        issues: input.issues || [],
        suggestions: input.suggestions || [],
        metadata: {
          ...input.metadata
        }
      });

      const savedFeedback = await feedbackDoc.save();
      console.log(`[TrainingStorage] Recorded feedback: ${savedFeedback.id} for config: ${input.configId}`);
      
      return this.mapDocumentToFeedback(savedFeedback);
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to record feedback:`, error);
      throw new Error(`Failed to record training feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(id: string): Promise<TrainingFeedback | null> {
    try {
      const feedback = await TrainingFeedbackModel.findOne({ id });
      if (feedback) {
        console.log(`[TrainingStorage] Retrieved feedback: ${id}`);
        return this.mapDocumentToFeedback(feedback);
      } else {
        console.log(`[TrainingStorage] Feedback not found: ${id}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to get feedback ${id}:`, error);
      throw new Error(`Failed to retrieve training feedback: ${error.message}`);
    }
  }

  /**
   * List feedback with optional filters
   */
  async listFeedback(filters: FeedbackFilters = {}): Promise<FeedbackListResult> {
    try {
      const {
        configId,
        agentType,
        ratingMin,
        ratingMax,
        dateFrom,
        dateTo,
        limit = 20,
        offset = 0
      } = filters;

      // Build query
      const query: any = {};
      
      if (configId) query.configId = configId;
      if (agentType) query.agentType = agentType;
      if (ratingMin !== undefined || ratingMax !== undefined) {
        query['rating.overall'] = {};
        if (ratingMin !== undefined) query['rating.overall'].$gte = ratingMin;
        if (ratingMax !== undefined) query['rating.overall'].$lte = ratingMax;
      }
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = dateFrom;
        if (dateTo) query.createdAt.$lte = dateTo;
      }

      // Execute query with pagination
      const [feedback, total] = await Promise.all([
        TrainingFeedbackModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        TrainingFeedbackModel.countDocuments(query)
      ]);

      const hasMore = offset + feedback.length < total;

      // Calculate summary statistics
      const avgRating = feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length 
        : 0;

      const totalIssues = feedback.reduce((sum, f) => sum + f.issues.length, 0);

      const issueCounts: Record<string, number> = {};
      feedback.forEach(f => {
        f.issues.forEach(issue => {
          issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        });
      });

      const commonIssues = Object.entries(issueCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      console.log(`[TrainingStorage] Listed ${feedback.length} feedback entries (total: ${total})`);

      return {
        feedback: feedback.map(f => this.mapDocumentToFeedback(f)),
        total,
        hasMore,
        summary: {
          avgRating,
          totalIssues,
          commonIssues
        }
      };
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to list feedback:`, error);
      throw new Error(`Failed to list training feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback for a specific configuration
   */
  async getFeedbackForConfig(
    configId: string, 
    minSamples: number = 10
  ): Promise<TrainingFeedback[]> {
    try {
      const feedback = await TrainingFeedbackModel.find({ configId })
        .sort({ createdAt: -1 })
        .limit(minSamples * 2) // Get more than needed to ensure we have enough
        .exec();

      console.log(`[TrainingStorage] Retrieved ${feedback.length} feedback entries for config: ${configId}`);
      
      return feedback.map(f => this.mapDocumentToFeedback(f));
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to get feedback for config ${configId}:`, error);
      throw new Error(`Failed to retrieve feedback for configuration: ${error.message}`);
    }
  }

  /**
   * Get feedback statistics for a configuration
   */
  async getConfigFeedbackStats(configId: string): Promise<{
    totalFeedback: number;
    avgRating: number;
    ratingDistribution: Record<number, number>;
    commonIssues: Array<{ type: string; count: number; percentage: number }>;
    recentTrend: 'improving' | 'declining' | 'stable';
  }> {
    try {
      const feedback = await TrainingFeedbackModel.find({ configId })
        .sort({ createdAt: -1 })
        .exec();

      if (feedback.length === 0) {
        return {
          totalFeedback: 0,
          avgRating: 0,
          ratingDistribution: {},
          commonIssues: [],
          recentTrend: 'stable'
        };
      }

      // Calculate average rating
      const avgRating = feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length;

      // Calculate rating distribution
      const ratingDistribution: Record<number, number> = {};
      feedback.forEach(f => {
        const rating = f.rating.overall;
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });

      // Calculate common issues
      const issueCounts: Record<string, number> = {};
      feedback.forEach(f => {
        f.issues.forEach(issue => {
          issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        });
      });

      const commonIssues = Object.entries(issueCounts)
        .map(([type, count]) => ({
          type,
          count,
          percentage: (count / feedback.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate recent trend (compare last 30% vs previous 30%)
      const recentCount = Math.max(1, Math.floor(feedback.length * 0.3));
      const recentFeedback = feedback.slice(0, recentCount);
      const previousFeedback = feedback.slice(recentCount, recentCount * 2);

      const recentAvg = recentFeedback.reduce((sum, f) => sum + f.rating.overall, 0) / recentFeedback.length;
      const previousAvg = previousFeedback.length > 0 
        ? previousFeedback.reduce((sum, f) => sum + f.rating.overall, 0) / previousFeedback.length
        : recentAvg;

      let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentAvg > previousAvg + 0.2) recentTrend = 'improving';
      else if (recentAvg < previousAvg - 0.2) recentTrend = 'declining';

      console.log(`[TrainingStorage] Calculated stats for config ${configId}: ${feedback.length} feedback entries`);

      return {
        totalFeedback: feedback.length,
        avgRating,
        ratingDistribution,
        commonIssues,
        recentTrend
      };
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to get feedback stats for config ${configId}:`, error);
      throw new Error(`Failed to get feedback statistics: ${error.message}`);
    }
  }

  /**
   * Store configuration updates from training
   */
  async storeConfigUpdate(update: ConfigUpdate): Promise<void> {
    try {
      // This would typically be stored in a separate collection
      // For now, we'll just log it
      console.log(`[TrainingStorage] Stored config update: ${update.id} for config: ${update.configId}`);
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to store config update:`, error);
      throw new Error(`Failed to store configuration update: ${error.message}`);
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byAgentType: Record<string, number>;
    avgRating: number;
    recentActivity: number; // feedback in last 7 days
  }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [total, typeCounts, avgRatingResult, recentCount] = await Promise.all([
        TrainingFeedbackModel.countDocuments(),
        TrainingFeedbackModel.aggregate([
          { $group: { _id: '$agentType', count: { $sum: 1 } } }
        ]),
        TrainingFeedbackModel.aggregate([
          { $group: { _id: null, avgRating: { $avg: '$rating.overall' } } }
        ]),
        TrainingFeedbackModel.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
      ]);

      const byAgentType: Record<string, number> = {};
      typeCounts.forEach(item => {
        byAgentType[item._id] = item.count;
      });

      const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

      return {
        total,
        byAgentType,
        avgRating,
        recentActivity: recentCount
      };
    } catch (error: any) {
      console.error(`[TrainingStorage] Failed to get feedback stats:`, error);
      throw new Error(`Failed to get feedback statistics: ${error.message}`);
    }
  }

  /**
   * Generate a unique ID for feedback
   */
  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map MongoDB document to TrainingFeedback type
   */
  private mapDocumentToFeedback(doc: ITrainingFeedbackDocument): TrainingFeedback {
    return {
      id: doc.id,
      requestId: doc.requestId,
      configId: doc.configId,
      agentType: doc.agentType,
      rating: {
        overall: doc.rating.overall,
        ...(doc.rating.accuracy !== undefined && { accuracy: doc.rating.accuracy }),
        ...(doc.rating.relevance !== undefined && { relevance: doc.rating.relevance }),
        ...(doc.rating.clarity !== undefined && { clarity: doc.rating.clarity }),
        ...(doc.rating.actionability !== undefined && { actionability: doc.rating.actionability })
      },
      issues: doc.issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        ...(issue.suggestion && { suggestion: issue.suggestion })
      })),
      suggestions: doc.suggestions,
      metadata: {
        ...(doc.metadata?.query && { query: doc.metadata.query }),
        ...(doc.metadata?.responseTime !== undefined && { responseTime: doc.metadata.responseTime }),
        ...(doc.metadata?.confidence !== undefined && { confidence: doc.metadata.confidence }),
        ...(doc.metadata?.qualityScore !== undefined && { qualityScore: doc.metadata.qualityScore }),
        ...(doc.metadata?.userAgent && { userAgent: doc.metadata.userAgent }),
        ...(doc.metadata?.sessionId && { sessionId: doc.metadata.sessionId })
      },
      createdAt: doc.createdAt
    };
  }
}
