/**
 * Execution Storage Service
 * Service layer for managing execution results in MongoDB
 */

import { ToolResult } from '../../shared/types/agent.js';
import { ExecutionModel, IExecutionDocument, ExecutionMetadata } from '../models/execution.model.js';

export interface ExecutionFilters {
  status?: 'completed' | 'failed' | 'partial';
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ExecutionListResult {
  executions: IExecutionDocument[];
  total: number;
  hasMore: boolean;
}

export class ExecutionStorageService {
  /**
   * Save execution results to the database
   */
  async saveExecution(
    requestId: string,
    results: ToolResult[],
    metadata: ExecutionMetadata
  ): Promise<IExecutionDocument> {
    try {
      // Determine status based on results
      const failedResults = results.filter(r => !r.success);
      const status = failedResults.length === 0 ? 'completed' : 
                    failedResults.length === results.length ? 'failed' : 'partial';

      const executionDoc = new ExecutionModel({
        requestId,
        results,
        metadata,
        status
      });

      const savedExecution = await executionDoc.save();
      console.log(`[ExecutionStorage] Saved execution for requestId: ${requestId}`);
      return savedExecution;
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to save execution ${requestId}:`, error);
      throw new Error(`Failed to save execution: ${error.message}`);
    }
  }

  /**
   * Retrieve execution results by requestId
   */
  async getExecution(requestId: string): Promise<IExecutionDocument | null> {
    try {
      const execution = await ExecutionModel.findOne({ requestId });
      if (execution) {
        console.log(`[ExecutionStorage] Retrieved execution for requestId: ${requestId}`);
      } else {
        console.log(`[ExecutionStorage] Execution not found for requestId: ${requestId}`);
      }
      return execution;
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to get execution ${requestId}:`, error);
      throw new Error(`Failed to retrieve execution: ${error.message}`);
    }
  }

  /**
   * Update execution results (for partial updates or corrections)
   */
  async updateExecution(
    requestId: string,
    updates: Partial<{
      results: ToolResult[];
      metadata: ExecutionMetadata;
      status: 'completed' | 'failed' | 'partial';
    }>
  ): Promise<IExecutionDocument | null> {
    try {
      const updatedExecution = await ExecutionModel.findOneAndUpdate(
        { requestId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (updatedExecution) {
        console.log(`[ExecutionStorage] Updated execution for requestId: ${requestId}`);
      } else {
        console.log(`[ExecutionStorage] Execution not found for update: ${requestId}`);
      }

      return updatedExecution;
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to update execution ${requestId}:`, error);
      throw new Error(`Failed to update execution: ${error.message}`);
    }
  }

  /**
   * Delete execution results (for cleanup purposes)
   */
  async deleteExecution(requestId: string): Promise<boolean> {
    try {
      const result = await ExecutionModel.deleteOne({ requestId });
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        console.log(`[ExecutionStorage] Deleted execution for requestId: ${requestId}`);
      } else {
        console.log(`[ExecutionStorage] Execution not found for deletion: ${requestId}`);
      }

      return deleted;
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to delete execution ${requestId}:`, error);
      throw new Error(`Failed to delete execution: ${error.message}`);
    }
  }

  /**
   * List executions with optional filters and pagination
   */
  async listExecutions(filters: ExecutionFilters = {}): Promise<ExecutionListResult> {
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
      const [executions, total] = await Promise.all([
        ExecutionModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        ExecutionModel.countDocuments(query)
      ]);

      const hasMore = offset + executions.length < total;

      console.log(`[ExecutionStorage] Listed ${executions.length} executions (total: ${total})`);

      return {
        executions,
        total,
        hasMore
      };
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to list executions:`, error);
      throw new Error(`Failed to list executions: ${error.message}`);
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageDuration: number;
  }> {
    try {
      const [total, statusCounts, avgDurationResult] = await Promise.all([
        ExecutionModel.countDocuments(),
        ExecutionModel.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        ExecutionModel.aggregate([
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$metadata.totalDurationMs' }
            }
          }
        ])
      ]);

      const byStatus: Record<string, number> = {};
      statusCounts.forEach(item => {
        byStatus[item._id] = item.count;
      });

      const averageDuration = avgDurationResult.length > 0 ? avgDurationResult[0].avgDuration : 0;

      return { total, byStatus, averageDuration };
    } catch (error: any) {
      console.error(`[ExecutionStorage] Failed to get execution stats:`, error);
      throw new Error(`Failed to get execution stats: ${error.message}`);
    }
  }
}
