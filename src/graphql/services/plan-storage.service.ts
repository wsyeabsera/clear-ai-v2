/**
 * Plan Storage Service
 * Service layer for managing execution plans in MongoDB
 */

import { Plan } from '../../shared/types/agent.js';
import { PlanModel, IPlanDocument } from '../models/plan.model.js';

export interface PlanFilters {
  status?: 'pending' | 'executing' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface PlanListResult {
  plans: IPlanDocument[];
  total: number;
  hasMore: boolean;
}

export class PlanStorageService {
  /**
   * Save a new plan to the database
   */
  async savePlan(
    requestId: string,
    query: string,
    plan: Plan,
    context?: any
  ): Promise<IPlanDocument> {
    try {
      const planDoc = new PlanModel({
        requestId,
        query,
        plan,
        context,
        status: 'pending'
      });

      const savedPlan = await planDoc.save();
      console.log(`[PlanStorage] Saved plan for requestId: ${requestId}`);
      return savedPlan;
    } catch (error: any) {
      console.error(`[PlanStorage] Failed to save plan ${requestId}:`, error);
      throw new Error(`Failed to save plan: ${error.message}`);
    }
  }

  /**
   * Retrieve a plan by requestId
   */
  async getPlan(requestId: string): Promise<IPlanDocument | null> {
    try {
      const plan = await PlanModel.findOne({ requestId });
      if (plan) {
        console.log(`[PlanStorage] Retrieved plan for requestId: ${requestId}`);
      } else {
        console.log(`[PlanStorage] Plan not found for requestId: ${requestId}`);
      }
      return plan;
    } catch (error: any) {
      console.error(`[PlanStorage] Failed to get plan ${requestId}:`, error);
      throw new Error(`Failed to retrieve plan: ${error.message}`);
    }
  }

  /**
   * Update the status of a plan
   */
  async updatePlanStatus(
    requestId: string,
    status: 'pending' | 'executing' | 'completed' | 'failed'
  ): Promise<IPlanDocument | null> {
    try {
      const updatedPlan = await PlanModel.findOneAndUpdate(
        { requestId },
        { status, updatedAt: new Date() },
        { new: true }
      );

      if (updatedPlan) {
        console.log(`[PlanStorage] Updated plan ${requestId} status to: ${status}`);
      } else {
        console.log(`[PlanStorage] Plan not found for status update: ${requestId}`);
      }

      return updatedPlan;
    } catch (error: any) {
      console.error(`[PlanStorage] Failed to update plan status ${requestId}:`, error);
      throw new Error(`Failed to update plan status: ${error.message}`);
    }
  }

  /**
   * Delete a plan (for cleanup purposes)
   */
  async deletePlan(requestId: string): Promise<boolean> {
    try {
      const result = await PlanModel.deleteOne({ requestId });
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        console.log(`[PlanStorage] Deleted plan for requestId: ${requestId}`);
      } else {
        console.log(`[PlanStorage] Plan not found for deletion: ${requestId}`);
      }

      return deleted;
    } catch (error: any) {
      console.error(`[PlanStorage] Failed to delete plan ${requestId}:`, error);
      throw new Error(`Failed to delete plan: ${error.message}`);
    }
  }

  /**
   * List plans with optional filters and pagination
   */
  async listPlans(filters: PlanFilters = {}): Promise<PlanListResult> {
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
      const [plans, total] = await Promise.all([
        PlanModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        PlanModel.countDocuments(query)
      ]);

      const hasMore = offset + plans.length < total;

      console.log(`[PlanStorage] Listed ${plans.length} plans (total: ${total})`);

      return {
        plans,
        total,
        hasMore
      };
    } catch (error: any) {
      console.error(`[PlanStorage] Failed to list plans:`, error);
      throw new Error(`Failed to list plans: ${error.message}`);
    }
  }

  /**
   * Get plan statistics
   */
  async getPlanStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }> {
    try {
      const [total, statusCounts] = await Promise.all([
        PlanModel.countDocuments(),
        PlanModel.aggregate([
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
      console.error(`[PlanStorage] Failed to get plan stats:`, error);
      throw new Error(`Failed to get plan stats: ${error.message}`);
    }
  }
}
