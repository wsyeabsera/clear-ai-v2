/**
 * Analysis Storage Service
 * Service layer for managing analysis results in MongoDB
 */

import { Analysis } from '../../shared/types/agent.js';
import { AnalysisModel, IAnalysisDocument } from '../models/analysis.model.js';

export interface AnalysisFilters {
  status?: 'pending' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AnalysisListResult {
  analyses: IAnalysisDocument[];
  total: number;
  hasMore: boolean;
}

export class AnalysisStorageService {
  /**
   * Save analysis results to the database
   */
  async saveAnalysis(
    requestId: string,
    analysis: Analysis,
    query: string
  ): Promise<IAnalysisDocument> {
    try {
      // Use findOneAndUpdate with upsert to allow re-analysis with different configs
      const savedAnalysis = await AnalysisModel.findOneAndUpdate(
        { requestId },
        {
          requestId,
          query,
          analysis,
          status: 'completed',
          timestamp: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`[AnalysisStorage] Saved analysis for requestId: ${requestId}`);
      return savedAnalysis;
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to save analysis ${requestId}:`, error);
      throw new Error(`Failed to save analysis: ${error.message}`);
    }
  }

  /**
   * Retrieve analysis results by requestId
   */
  async getAnalysis(requestId: string): Promise<IAnalysisDocument | null> {
    try {
      const analysis = await AnalysisModel.findOne({ requestId });
      if (analysis) {
        console.log(`[AnalysisStorage] Retrieved analysis for requestId: ${requestId}`);
      } else {
        console.log(`[AnalysisStorage] Analysis not found for requestId: ${requestId}`);
      }
      return analysis;
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to get analysis ${requestId}:`, error);
      throw new Error(`Failed to retrieve analysis: ${error.message}`);
    }
  }

  /**
   * Update analysis results (for partial updates or corrections)
   */
  async updateAnalysis(
    requestId: string,
    updates: Partial<{
      analysis: Analysis;
      query: string;
      status: 'pending' | 'completed' | 'failed';
    }>
  ): Promise<IAnalysisDocument | null> {
    try {
      const updatedAnalysis = await AnalysisModel.findOneAndUpdate(
        { requestId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (updatedAnalysis) {
        console.log(`[AnalysisStorage] Updated analysis for requestId: ${requestId}`);
      } else {
        console.log(`[AnalysisStorage] Analysis not found for update: ${requestId}`);
      }

      return updatedAnalysis;
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to update analysis ${requestId}:`, error);
      throw new Error(`Failed to update analysis: ${error.message}`);
    }
  }

  /**
   * Delete analysis results (for cleanup purposes)
   */
  async deleteAnalysis(requestId: string): Promise<boolean> {
    try {
      const result = await AnalysisModel.deleteOne({ requestId });
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        console.log(`[AnalysisStorage] Deleted analysis for requestId: ${requestId}`);
      } else {
        console.log(`[AnalysisStorage] Analysis not found for deletion: ${requestId}`);
      }

      return deleted;
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to delete analysis ${requestId}:`, error);
      throw new Error(`Failed to delete analysis: ${error.message}`);
    }
  }

  /**
   * List analyses with optional filters and pagination
   */
  async listAnalyses(filters: AnalysisFilters = {}): Promise<AnalysisListResult> {
    try {
      const {
        status,
        limit = 20,
        offset = 0,
        startDate,
        endDate
      } = filters;

      // Build query
      const query: any = {};
      
      if (status) {
        query.status = status;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = startDate;
        }
        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      // Execute query with pagination
      const [analyses, total] = await Promise.all([
        AnalysisModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        AnalysisModel.countDocuments(query)
      ]);

      const hasMore = offset + analyses.length < total;

      console.log(`[AnalysisStorage] Listed ${analyses.length} analyses (total: ${total})`);

      return {
        analyses,
        total,
        hasMore
      };
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to list analyses:`, error);
      throw new Error(`Failed to list analyses: ${error.message}`);
    }
  }

  /**
   * Get analysis statistics
   */
  async getAnalysisStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }> {
    try {
      const [total, statusCounts] = await Promise.all([
        AnalysisModel.countDocuments(),
        AnalysisModel.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const byStatus: Record<string, number> = {};
      statusCounts.forEach(item => {
        byStatus[item._id] = item.count;
      });

      return { total, byStatus };
    } catch (error: any) {
      console.error(`[AnalysisStorage] Failed to get analysis stats:`, error);
      throw new Error(`Failed to get analysis stats: ${error.message}`);
    }
  }
}
