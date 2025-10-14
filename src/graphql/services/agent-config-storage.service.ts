/**
 * Agent Config Storage Service
 * Service layer for managing agent configurations in MongoDB
 */

import { AgentConfig, CreateAgentConfigInput, UpdateAgentConfigInput, AgentConfigFilters, AgentConfigListResult, AgentType } from '../../shared/types/agent-config.js';
import { AgentConfigModel, IAgentConfigDocument } from '../models/agent-config.model.js';

export class AgentConfigStorageService {
  /**
   * Create a new agent configuration
   */
  async createConfig(input: CreateAgentConfigInput): Promise<AgentConfig> {
    try {
      // If this is being set as default, unset any existing default for this type
      if (input.isDefault) {
        await this.unsetDefaultForType(input.type);
      }

      const configDoc = new AgentConfigModel({
        id: this.generateId(),
        name: input.name,
        type: input.type,
        config: input.config,
        metadata: {
          ...input.metadata,
          isSystemDefault: input.metadata?.isSystemDefault || false
        },
        isDefault: input.isDefault || false,
        isActive: true
      });

      const savedConfig = await configDoc.save();
      console.log(`[AgentConfigStorage] Created config: ${savedConfig.id} (${savedConfig.name})`);
      
      return this.mapDocumentToConfig(savedConfig);
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to create config:`, error);
      throw new Error(`Failed to create agent config: ${error.message}`);
    }
  }

  /**
   * Get an agent configuration by ID
   */
  async getConfig(id: string): Promise<AgentConfig | null> {
    try {
      const config = await AgentConfigModel.findOne({ id });
      if (config) {
        console.log(`[AgentConfigStorage] Retrieved config: ${id}`);
        return this.mapDocumentToConfig(config);
      } else {
        console.log(`[AgentConfigStorage] Config not found: ${id}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to get config ${id}:`, error);
      throw new Error(`Failed to retrieve agent config: ${error.message}`);
    }
  }

  /**
   * Get the default configuration for an agent type
   */
  async getDefaultConfig(type: AgentType): Promise<AgentConfig | null> {
    try {
      const config = await AgentConfigModel.findOne({ 
        type, 
        isDefault: true, 
        isActive: true 
      });
      
      if (config) {
        console.log(`[AgentConfigStorage] Retrieved default config for ${type}: ${config.id}`);
        return this.mapDocumentToConfig(config);
      } else {
        console.log(`[AgentConfigStorage] No default config found for type: ${type}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to get default config for ${type}:`, error);
      throw new Error(`Failed to retrieve default config: ${error.message}`);
    }
  }

  /**
   * List agent configurations with optional filters
   */
  async listConfigs(filters: AgentConfigFilters = {}): Promise<AgentConfigListResult> {
    try {
      const {
        type,
        isActive,
        isDefault,
        createdBy,
        tags,
        limit = 20,
        offset = 0
      } = filters;

      // Build query
      const query: any = {};
      
      if (type) query.type = type;
      if (isActive !== undefined) query.isActive = isActive;
      if (isDefault !== undefined) query.isDefault = isDefault;
      if (createdBy) query['metadata.createdBy'] = createdBy;
      if (tags && tags.length > 0) {
        query['metadata.tags'] = { $in: tags };
      }

      // Execute query with pagination
      const [configs, total] = await Promise.all([
        AgentConfigModel.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        AgentConfigModel.countDocuments(query)
      ]);

      const hasMore = offset + configs.length < total;

      console.log(`[AgentConfigStorage] Listed ${configs.length} configs (total: ${total})`);

      return {
        configs: configs.map(config => this.mapDocumentToConfig(config)),
        total,
        hasMore
      };
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to list configs:`, error);
      throw new Error(`Failed to list agent configs: ${error.message}`);
    }
  }

  /**
   * Update an agent configuration
   */
  async updateConfig(id: string, input: UpdateAgentConfigInput): Promise<AgentConfig | null> {
    try {
      // If this is being set as default, unset any existing default for this type
      if ('isDefault' in input && input.isDefault) {
        const existingConfig = await AgentConfigModel.findOne({ id });
        if (existingConfig) {
          await this.unsetDefaultForType(existingConfig.type);
        }
      }

      const updateData: any = {
        ...input,
        updatedAt: new Date()
      };

      const updatedConfig = await AgentConfigModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true }
      );

      if (updatedConfig) {
        console.log(`[AgentConfigStorage] Updated config: ${id}`);
        return this.mapDocumentToConfig(updatedConfig);
      } else {
        console.log(`[AgentConfigStorage] Config not found for update: ${id}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to update config ${id}:`, error);
      throw new Error(`Failed to update agent config: ${error.message}`);
    }
  }

  /**
   * Delete an agent configuration
   */
  async deleteConfig(id: string): Promise<boolean> {
    try {
      const result = await AgentConfigModel.deleteOne({ id });
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        console.log(`[AgentConfigStorage] Deleted config: ${id}`);
      } else {
        console.log(`[AgentConfigStorage] Config not found for deletion: ${id}`);
      }

      return deleted;
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to delete config ${id}:`, error);
      throw new Error(`Failed to delete agent config: ${error.message}`);
    }
  }

  /**
   * Set a configuration as the default for its type
   */
  async setDefaultConfig(id: string): Promise<AgentConfig | null> {
    try {
      const config = await AgentConfigModel.findOne({ id });
      if (!config) {
        throw new Error(`Config not found: ${id}`);
      }

      // Unset existing default for this type
      await this.unsetDefaultForType(config.type);

      // Set this config as default
      const updatedConfig = await AgentConfigModel.findOneAndUpdate(
        { id },
        { isDefault: true, updatedAt: new Date() },
        { new: true }
      );

      if (updatedConfig) {
        console.log(`[AgentConfigStorage] Set default config: ${id} for type: ${config.type}`);
        return this.mapDocumentToConfig(updatedConfig);
      }

      return null;
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to set default config ${id}:`, error);
      throw new Error(`Failed to set default config: ${error.message}`);
    }
  }

  /**
   * Clone an existing configuration
   */
  async cloneConfig(id: string, newName: string): Promise<AgentConfig | null> {
    try {
      const originalConfig = await AgentConfigModel.findOne({ id });
      if (!originalConfig) {
        throw new Error(`Config not found: ${id}`);
      }

      const clonedConfig = new AgentConfigModel({
        id: this.generateId(),
        name: newName,
        type: originalConfig.type,
        config: originalConfig.config,
        metadata: {
          ...originalConfig.metadata,
          createdBy: originalConfig.metadata?.createdBy,
          description: `Cloned from ${originalConfig.name}`,
          isSystemDefault: false
        },
        isDefault: false,
        isActive: true
      });

      const savedConfig = await clonedConfig.save();
      console.log(`[AgentConfigStorage] Cloned config: ${id} -> ${savedConfig.id} (${newName})`);
      
      return this.mapDocumentToConfig(savedConfig);
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to clone config ${id}:`, error);
      throw new Error(`Failed to clone agent config: ${error.message}`);
    }
  }

  /**
   * Update performance metrics for a configuration
   */
  async updatePerformanceMetrics(
    id: string, 
    metrics: {
      avgConfidence?: number;
      avgQualityScore?: number;
      totalUsage?: number;
      successRate?: number;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        'metadata.performanceMetrics.lastUsed': new Date(),
        updatedAt: new Date()
      };

      if (metrics.avgConfidence !== undefined) {
        updateData['metadata.performanceMetrics.avgConfidence'] = metrics.avgConfidence;
      }
      if (metrics.avgQualityScore !== undefined) {
        updateData['metadata.performanceMetrics.avgQualityScore'] = metrics.avgQualityScore;
      }
      if (metrics.totalUsage !== undefined) {
        updateData['metadata.performanceMetrics.totalUsage'] = metrics.totalUsage;
      }
      if (metrics.successRate !== undefined) {
        updateData['metadata.performanceMetrics.successRate'] = metrics.successRate;
      }

      await AgentConfigModel.findOneAndUpdate({ id }, updateData);
      console.log(`[AgentConfigStorage] Updated performance metrics for config: ${id}`);
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to update performance metrics for ${id}:`, error);
      throw new Error(`Failed to update performance metrics: ${error.message}`);
    }
  }

  /**
   * Get configuration statistics
   */
  async getConfigStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const [total, typeCounts, statusCounts] = await Promise.all([
        AgentConfigModel.countDocuments(),
        AgentConfigModel.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        AgentConfigModel.aggregate([
          { $group: { _id: '$isActive', count: { $sum: 1 } } }
        ])
      ]);

      const byType: Record<string, number> = {};
      typeCounts.forEach(item => {
        byType[item._id] = item.count;
      });

      const byStatus: Record<string, number> = {};
      statusCounts.forEach(item => {
        byStatus[item._id ? 'active' : 'inactive'] = item.count;
      });

      return { total, byType, byStatus };
    } catch (error: any) {
      console.error(`[AgentConfigStorage] Failed to get config stats:`, error);
      throw new Error(`Failed to get configuration statistics: ${error.message}`);
    }
  }

  /**
   * Unset default flag for all configs of a given type
   */
  private async unsetDefaultForType(type: AgentType): Promise<void> {
    await AgentConfigModel.updateMany(
      { type, isDefault: true },
      { isDefault: false, updatedAt: new Date() }
    );
  }

  /**
   * Generate a unique ID for configurations
   */
  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map MongoDB document to AgentConfig type
   */
  private mapDocumentToConfig(doc: IAgentConfigDocument): AgentConfig {
    return {
      id: doc.id,
      name: doc.name,
      version: doc.version,
      type: doc.type,
      isDefault: doc.isDefault,
      isActive: doc.isActive,
      config: doc.config as any,
      metadata: {
        ...(doc.metadata?.createdBy && { createdBy: doc.metadata.createdBy }),
        ...(doc.metadata?.description && { description: doc.metadata.description }),
        tags: doc.metadata?.tags || [],
        ...(doc.metadata?.performanceMetrics && {
          performanceMetrics: {
            avgConfidence: doc.metadata.performanceMetrics.avgConfidence,
            avgQualityScore: doc.metadata.performanceMetrics.avgQualityScore,
            totalUsage: doc.metadata.performanceMetrics.totalUsage,
            ...(doc.metadata.performanceMetrics.lastUsed && { lastUsed: doc.metadata.performanceMetrics.lastUsed }),
            ...(doc.metadata.performanceMetrics.successRate !== undefined && { successRate: doc.metadata.performanceMetrics.successRate })
          }
        }),
        ...(doc.metadata?.version && { version: doc.metadata.version }),
        ...(doc.metadata?.isSystemDefault !== undefined && { isSystemDefault: doc.metadata.isSystemDefault })
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
