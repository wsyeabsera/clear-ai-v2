#!/usr/bin/env node

// Comprehensive tool category testing
import { ToolRegistry } from './dist/shared/tool-registry.js';
import path from 'path';

async function testAllToolCategories() {
  console.log('🧪 Testing All Tool Categories...');
  console.log('================================');
  
  try {
    const toolRegistry = ToolRegistry.getInstance();
    const toolsPath = path.join(process.cwd(), 'dist/tools');
    const apiUrl = 'http://localhost:3001/api';
    
    // Initialize tool registry
    await toolRegistry.discoverTools(toolsPath, apiUrl);
    const toolNames = toolRegistry.getToolNames();
    console.log(`✅ Registered ${toolNames.length} tools\n`);
    
    // Test categories
    const testCategories = {
      'Facilities CRUD': ['facilities_list', 'facilities_get'],
      'Shipments CRUD': ['shipments_list', 'shipments_get'],
      'Contaminants CRUD': ['contaminants_list', 'contaminants_get'],
      'Inspections CRUD': ['inspections_list', 'inspections_get'],
      'Analytics': ['analytics_contamination_rate', 'analytics_facility_performance'],
      'Relationships': ['shipments_get_with_contaminants', 'facilities_get_with_activity'],
      'Database': ['database_reset']
    };
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      categories: {}
    };
    
    for (const [categoryName, tools] of Object.entries(testCategories)) {
      console.log(`📋 Testing ${categoryName}:`);
      results.categories[categoryName] = { passed: 0, failed: 0, total: 0 };
      
      for (const toolName of tools) {
        results.total++;
        results.categories[categoryName].total++;
        
        const tool = toolRegistry.getToolInstance(toolName);
        if (tool) {
          console.log(`  Testing ${toolName}...`);
          
          try {
            // Test with empty params for list tools, specific ID for get tools
            let testParams = {};
            if (toolName.includes('_get') && !toolName.includes('_get_with_')) {
              // Use known IDs for get tools
              if (toolName.includes('facilities_get')) testParams = { id: 'facility-1' };
              else if (toolName.includes('shipments_get')) testParams = { id: 'shipment-1' };
              else if (toolName.includes('contaminants_get')) testParams = { id: 'contaminant-1' };
              else if (toolName.includes('inspections_get')) testParams = { id: 'inspection-1' };
            }
            
            const result = await tool.execute(testParams);
            
            if (result.success) {
              console.log(`    ✅ PASSED - Success: ${result.success}`);
              results.passed++;
              results.categories[categoryName].passed++;
            } else {
              console.log(`    ❌ FAILED - ${result.error?.message || 'Unknown error'}`);
              results.failed++;
              results.categories[categoryName].failed++;
            }
          } catch (error) {
            console.log(`    ❌ FAILED - ${error.message}`);
            results.failed++;
            results.categories[categoryName].failed++;
          }
        } else {
          console.log(`    ❌ FAILED - Tool not found`);
          results.failed++;
          results.categories[categoryName].failed++;
        }
      }
      console.log('');
    }
    
    // Summary
    console.log('📊 Test Results Summary:');
    console.log('========================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('');
    
    console.log('📈 Category Breakdown:');
    for (const [category, stats] of Object.entries(results.categories)) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    }
    
    if (results.failed === 0) {
      console.log('\n🎉 All tool categories are working perfectly!');
    } else {
      console.log(`\n⚠️  ${results.failed} tests failed - check the output above for details`);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

testAllToolCategories();
