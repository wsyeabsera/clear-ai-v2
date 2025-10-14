/**
 * Tool Relationship Mapping System
 * 
 * Maps relationships between tools to help the planner select complementary tools
 * and avoid missing critical tool combinations that lead to benchmark failures.
 */

export interface ToolRelationship {
  tool: string;
  complementaryTools: string[];  // Tools often used together
  requiredTools?: string[];      // Tools that must be used together
  supportingTools?: string[];    // Optional but helpful tools
  categories: string[];          // Contract validation, compliance, etc.
  intentTypes: string[];         // READ, CREATE, ANALYZE, etc.
  description: string;           // Human-readable description
}

export interface ToolCategory {
  name: string;
  description: string;
  primaryTools: string[];
  supportingTools: string[];
  requiredForIntents: string[];
}

export class ToolRelationshipManager {
  private relationships: Map<string, ToolRelationship> = new Map();
  private categories: Map<string, ToolCategory> = new Map();

  constructor() {
    this.initializeRelationships();
    this.initializeCategories();
  }

  /**
   * Get complementary tools for a given tool
   */
  getComplementaryTools(toolName: string): string[] {
    const relationship = this.relationships.get(toolName);
    return relationship?.complementaryTools || [];
  }

  /**
   * Get required tools for a given tool
   */
  getRequiredTools(toolName: string): string[] {
    const relationship = this.relationships.get(toolName);
    return relationship?.requiredTools || [];
  }

  /**
   * Get supporting tools for a given tool
   */
  getSupportingTools(toolName: string): string[] {
    const relationship = this.relationships.get(toolName);
    return relationship?.supportingTools || [];
  }

  /**
   * Get all related tools (complementary + required + supporting)
   */
  getAllRelatedTools(toolName: string): string[] {
    const relationship = this.relationships.get(toolName);
    if (!relationship) return [];

    return [
      ...(relationship.complementaryTools || []),
      ...(relationship.requiredTools || []),
      ...(relationship.supportingTools || [])
    ];
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(categoryName: string): string[] {
    const category = this.categories.get(categoryName);
    return category ? [...category.primaryTools, ...category.supportingTools] : [];
  }

  /**
   * Get tools suitable for intent type
   */
  getToolsForIntent(intentType: string): string[] {
    const tools: string[] = [];
    
    for (const [toolName, relationship] of this.relationships) {
      if (relationship.intentTypes.includes(intentType)) {
        tools.push(toolName);
      }
    }
    
    return tools;
  }

  /**
   * Check if a tool combination is complete for a given intent
   */
  isToolCombinationComplete(selectedTools: string[], intentType: string, category?: string): {
    isComplete: boolean;
    missingTools: string[];
    suggestions: string[];
  } {
    const missingTools: string[] = [];
    const suggestions: string[] = [];

    // Check if we have tools for the intent type
    const intentTools = this.getToolsForIntent(intentType);
    const hasIntentTools = intentTools.some(tool => selectedTools.includes(tool));

    if (!hasIntentTools && intentTools.length > 0) {
      missingTools.push(...intentTools.slice(0, 2)); // Suggest top 2 tools for intent
    }

    // Check category completeness
    if (category) {
      const categoryTools = this.getToolsByCategory(category);
      const hasCategoryTools = categoryTools.some(tool => selectedTools.includes(tool));
      
      if (!hasCategoryTools && categoryTools.length > 0) {
        missingTools.push(...categoryTools.slice(0, 2));
      }
    }

    // Check for missing complementary tools
    for (const tool of selectedTools) {
      const complementary = this.getComplementaryTools(tool);
      const required = this.getRequiredTools(tool);
      
      // Check required tools
      for (const reqTool of required) {
        if (!selectedTools.includes(reqTool)) {
          missingTools.push(reqTool);
        }
      }
      
      // Suggest complementary tools
      for (const compTool of complementary) {
        if (!selectedTools.includes(compTool) && !suggestions.includes(compTool)) {
          suggestions.push(compTool);
        }
      }
    }

    return {
      isComplete: missingTools.length === 0,
      missingTools: [...new Set(missingTools)],
      suggestions: [...new Set(suggestions)]
    };
  }

  /**
   * Get relationship description for a tool
   */
  getToolDescription(toolName: string): string {
    const relationship = this.relationships.get(toolName);
    return relationship?.description || '';
  }

  /**
   * Initialize tool relationships based on benchmark failure analysis
   */
  private initializeRelationships(): void {
    // Contract Validation Tools
    this.relationships.set('contracts_list', {
      tool: 'contracts_list',
      complementaryTools: ['waste_producers_list', 'facilities_list'],
      supportingTools: ['contracts_get', 'shipment_loads_list'],
      categories: ['contract-validation', 'compliance'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists contracts - often needs producer and facility data for context'
    });

    this.relationships.set('shipments_validate_against_contract', {
      tool: 'shipments_validate_against_contract',
      requiredTools: ['contracts_get', 'shipment_loads_list'],
      complementaryTools: ['waste_producers_list', 'shipment_compositions_list'],
      categories: ['contract-validation', 'compliance'],
      intentTypes: ['ANALYZE', 'VALIDATE'],
      description: 'Validates shipments against contracts - requires contract and load data'
    });

    this.relationships.set('contracts_get_with_producer', {
      tool: 'contracts_get_with_producer',
      complementaryTools: ['waste_producers_list', 'contracts_list'],
      supportingTools: ['facilities_list'],
      categories: ['contract-validation', 'relationship-management'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Gets contracts with producer details - works well with producer lists'
    });

    // Compliance Tools
    this.relationships.set('producers_get_compliance_report', {
      tool: 'producers_get_compliance_report',
      requiredTools: ['contracts_list', 'shipments_list'],
      complementaryTools: ['waste_producers_list', 'shipment_loads_list'],
      supportingTools: ['facilities_list', 'inspections_list'],
      categories: ['compliance', 'analytics'],
      intentTypes: ['ANALYZE', 'REPORT'],
      description: 'Generates compliance reports - needs contracts, shipments, and producer data'
    });

    // Analytics Tools
    this.relationships.set('analytics_contamination_rate', {
      tool: 'analytics_contamination_rate',
      complementaryTools: ['contaminants_list', 'shipments_list'],
      supportingTools: ['facilities_list'],
      categories: ['analytics', 'monitoring'],
      intentTypes: ['ANALYZE', 'MONITOR'],
      description: 'Analyzes contamination rates - works with contaminants and shipments data'
    });

    this.relationships.set('analytics_facility_performance', {
      tool: 'analytics_facility_performance',
      complementaryTools: ['facilities_list', 'shipments_list', 'inspections_list'],
      supportingTools: ['contaminants_list'],
      categories: ['analytics', 'performance'],
      intentTypes: ['ANALYZE', 'MONITOR'],
      description: 'Analyzes facility performance - needs facilities, shipments, and inspections'
    });

    this.relationships.set('analytics_waste_distribution', {
      tool: 'analytics_waste_distribution',
      complementaryTools: ['shipments_list', 'shipment_compositions_list'],
      supportingTools: ['facilities_list', 'waste_producers_list'],
      categories: ['analytics', 'distribution'],
      intentTypes: ['ANALYZE', 'REPORT'],
      description: 'Analyzes waste distribution - requires shipments and composition data'
    });

    // Shipment Analysis Tools
    this.relationships.set('shipments_list', {
      tool: 'shipments_list',
      complementaryTools: ['facilities_list', 'contaminants_list'],
      supportingTools: ['shipment_loads_list', 'shipment_compositions_list', 'inspections_list'],
      categories: ['shipment-management', 'analytics'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists shipments - often needs facility and contaminant context'
    });

    this.relationships.set('shipments_get_with_contaminants', {
      tool: 'shipments_get_with_contaminants',
      complementaryTools: ['contaminants_list', 'facilities_list'],
      supportingTools: ['inspections_list'],
      categories: ['shipment-management', 'contamination'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Gets shipments with contaminants - works with contaminants and facilities'
    });

    // Composition and Load Tools
    this.relationships.set('shipment_compositions_list', {
      tool: 'shipment_compositions_list',
      complementaryTools: ['shipments_list', 'shipment_loads_list'],
      supportingTools: ['contracts_list', 'waste_producers_list'],
      categories: ['composition-analysis', 'validation'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists shipment compositions - often used with shipments and loads'
    });

    this.relationships.set('shipment_loads_list', {
      tool: 'shipment_loads_list',
      complementaryTools: ['shipments_list', 'shipment_compositions_list'],
      supportingTools: ['contracts_list', 'facilities_list'],
      categories: ['load-analysis', 'validation'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists shipment loads - works with shipments and compositions'
    });

    // Producer Tools
    this.relationships.set('waste_producers_list', {
      tool: 'waste_producers_list',
      complementaryTools: ['contracts_list', 'facilities_list'],
      supportingTools: ['producers_get_compliance_report'],
      categories: ['producer-management', 'compliance'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists waste producers - often needs contracts and facilities context'
    });

    // Facility Tools
    this.relationships.set('facilities_list', {
      tool: 'facilities_list',
      complementaryTools: ['shipments_list', 'inspections_list'],
      supportingTools: ['waste_producers_list', 'contracts_list'],
      categories: ['facility-management', 'analytics'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists facilities - works with shipments and inspections'
    });

    this.relationships.set('facilities_get_detailed', {
      tool: 'facilities_get_detailed',
      complementaryTools: ['shipments_list', 'inspections_list', 'contaminants_list'],
      supportingTools: ['analytics_facility_performance'],
      categories: ['facility-management', 'analytics'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Gets detailed facility info - needs shipments, inspections, and contaminants'
    });

    // Inspection Tools
    this.relationships.set('inspections_list', {
      tool: 'inspections_list',
      complementaryTools: ['shipments_list', 'facilities_list'],
      supportingTools: ['contaminants_list'],
      categories: ['inspection-management', 'compliance'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists inspections - works with shipments and facilities'
    });

    this.relationships.set('inspections_get_detailed', {
      tool: 'inspections_get_detailed',
      complementaryTools: ['shipments_get', 'facilities_get', 'contaminants_list'],
      supportingTools: ['inspections_list'],
      categories: ['inspection-management', 'detailed-analysis'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Gets detailed inspection info - needs shipment, facility, and contaminant data'
    });

    // Contaminant Tools
    this.relationships.set('contaminants_list', {
      tool: 'contaminants_list',
      complementaryTools: ['shipments_list', 'facilities_list'],
      supportingTools: ['analytics_contamination_rate'],
      categories: ['contamination-management', 'analytics'],
      intentTypes: ['READ', 'ANALYZE'],
      description: 'Lists contaminants - works with shipments and facilities'
    });
  }

  /**
   * Initialize tool categories
   */
  private initializeCategories(): void {
    this.categories.set('contract-validation', {
      name: 'contract-validation',
      description: 'Tools for validating shipments against contracts',
      primaryTools: ['contracts_list', 'shipments_validate_against_contract', 'contracts_get_with_producer'],
      supportingTools: ['shipment_loads_list', 'waste_producers_list', 'contracts_get'],
      requiredForIntents: ['VALIDATE', 'ANALYZE']
    });

    this.categories.set('compliance', {
      name: 'compliance',
      description: 'Tools for compliance checking and reporting',
      primaryTools: ['producers_get_compliance_report', 'contracts_list', 'inspections_list'],
      supportingTools: ['shipments_list', 'waste_producers_list', 'facilities_list'],
      requiredForIntents: ['ANALYZE', 'REPORT']
    });

    this.categories.set('analytics', {
      name: 'analytics',
      description: 'Tools for data analysis and reporting',
      primaryTools: ['analytics_contamination_rate', 'analytics_facility_performance', 'analytics_waste_distribution'],
      supportingTools: ['shipments_list', 'facilities_list', 'contaminants_list'],
      requiredForIntents: ['ANALYZE', 'MONITOR', 'REPORT']
    });

    this.categories.set('shipment-management', {
      name: 'shipment-management',
      description: 'Tools for managing shipments and related data',
      primaryTools: ['shipments_list', 'shipments_get', 'shipment_compositions_list', 'shipment_loads_list'],
      supportingTools: ['facilities_list', 'contaminants_list', 'inspections_list'],
      requiredForIntents: ['READ', 'CREATE', 'UPDATE', 'DELETE']
    });

    this.categories.set('relationship-management', {
      name: 'relationship-management',
      description: 'Tools for managing relationships between entities',
      primaryTools: ['contracts_get_with_producer', 'facilities_get_detailed', 'shipments_get_with_contaminants'],
      supportingTools: ['waste_producers_list', 'facilities_list', 'shipments_list'],
      requiredForIntents: ['READ', 'ANALYZE']
    });
  }
}
