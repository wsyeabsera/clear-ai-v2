/**
 * Metrics Storage
 * MongoDB storage for test metrics and historical tracking
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { MetricsRecord } from '../types/metrics.js';

// Mongoose schema for metrics
const metricsSchema = new Schema({
  scenarioId: { type: String, required: true, index: true },
  scenarioName: { type: String, required: true },
  category: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  success: { type: Boolean, required: true, index: true },
  
  performance: {
    totalLatencyMs: { type: Number, required: true },
    plannerLatencyMs: Number,
    executorLatencyMs: Number,
    analyzerLatencyMs: Number,
    summarizerLatencyMs: Number,
    toolExecutionMs: Schema.Types.Mixed,
    memoryQueryMs: Number,
  },
  
  cost: {
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    llmCost: { type: Number, default: 0 },
    memoryCost: Number,
    totalCost: { type: Number, default: 0 },
  },
  
  quality: {
    toolSelectionAccuracy: { type: Number, default: 1.0 },
    analysisRelevance: Number,
    responseHelpfulness: Number,
    validationConfidence: { type: Number, required: true },
  },
  
  health: {
    errorOccurred: { type: Boolean, default: false },
    errorMessage: String,
    timeoutOccurred: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
  },
});

// Indexes for efficient querying
metricsSchema.index({ scenarioId: 1, timestamp: -1 });
metricsSchema.index({ category: 1, timestamp: -1 });
metricsSchema.index({ success: 1, timestamp: -1 });

export class MetricsStorage {
  private model: Model<any>;
  private connected: boolean = false;

  constructor(private mongoUri: string) {
    this.model = mongoose.model('TestMetrics', metricsSchema);
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      await mongoose.connect(this.mongoUri);
      this.connected = true;
      console.log('✓ Metrics storage connected to MongoDB');
    } catch (error: any) {
      throw new Error(`Failed to connect to metrics database: ${error.message}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    await mongoose.disconnect();
    this.connected = false;
  }

  /**
   * Store a metrics record
   */
  async store(record: MetricsRecord): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      await this.model.create(record);
    } catch (error: any) {
      console.error('Failed to store metrics:', error.message);
    }
  }

  /**
   * Store multiple metrics records
   */
  async storeMany(records: MetricsRecord[]): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      await this.model.insertMany(records);
    } catch (error: any) {
      console.error('Failed to store metrics batch:', error.message);
    }
  }

  /**
   * Query metrics by scenario ID
   */
  async getByScenario(scenarioId: string, limit: number = 100): Promise<MetricsRecord[]> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.model
      .find({ scenarioId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as any;
  }

  /**
   * Query metrics by category
   */
  async getByCategory(category: string, limit: number = 100): Promise<MetricsRecord[]> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.model
      .find({ category })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as any;
  }

  /**
   * Query metrics by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<MetricsRecord[]> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.model
      .find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: -1 })
      .lean() as any;
  }

  /**
   * Get summary statistics
   */
  async getSummary(startDate?: Date, endDate?: Date): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    const matchStage: any = {};
    if (startDate && endDate) {
      matchStage.timestamp = { $gte: startDate, $lte: endDate };
    }

    const results = await this.model.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          passedTests: {
            $sum: { $cond: ['$success', 1, 0] },
          },
          failedTests: {
            $sum: { $cond: ['$success', 0, 1] },
          },
          avgLatency: { $avg: '$performance.totalLatencyMs' },
          totalCost: { $sum: '$cost.totalCost' },
          avgCost: { $avg: '$cost.totalCost' },
          latencies: { $push: '$performance.totalLatencyMs' },
        },
      },
    ]);

    if (results.length === 0) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        avgLatency: 0,
        totalCost: 0,
        avgCost: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
      };
    }

    const summary = results[0];
    const latencies = summary.latencies.sort((a: number, b: number) => a - b);

    return {
      totalTests: summary.totalTests,
      passedTests: summary.passedTests,
      failedTests: summary.failedTests,
      successRate: (summary.passedTests / summary.totalTests) * 100,
      avgLatency: summary.avgLatency,
      p50Latency: percentile(latencies, 50),
      p95Latency: percentile(latencies, 95),
      p99Latency: percentile(latencies, 99),
      totalCost: summary.totalCost,
      avgCost: summary.avgCost,
    };
  }

  /**
   * Get metrics by scenario over time
   */
  async getScenarioTrend(scenarioId: string, days: number = 30): Promise<any[]> {
    if (!this.connected) {
      await this.connect();
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.model
      .find({
        scenarioId,
        timestamp: { $gte: startDate },
      })
      .sort({ timestamp: 1 })
      .select('timestamp performance.totalLatencyMs success quality.validationConfidence')
      .lean();
  }

  /**
   * Clear old metrics
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    if (!this.connected) {
      await this.connect();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.model.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }
}

/**
 * Calculate percentile
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

