#!/usr/bin/env node

// Simple test script to verify tool registry fixes
import { ToolRegistry } from './dist/shared/tool-registry.js';
import path from 'path';

async function testToolRegistry() {
  console.log('🧪 Testing Tool Registry Fixes...');
  
  try {
    const toolRegistry = ToolRegistry.getInstance();
    const toolsPath = path.join(process.cwd(), 'dist/tools');
    const apiUrl = 'http://localhost:3001/api';
    
    console.log('📁 Tools path:', toolsPath);
    console.log('🔗 API URL:', apiUrl);
    
    // Test tool discovery
    console.log('\n🔍 Discovering tools...');
    await toolRegistry.discoverTools(toolsPath, apiUrl);
    
    // Get all registered tools
    const toolNames = toolRegistry.getToolNames();
    console.log(`\n✅ Registered ${toolNames.length} tools:`);
    
    // Test facilities_list specifically
    const facilitiesListTool = toolRegistry.getToolInstance('facilities_list');
    if (facilitiesListTool) {
      console.log('\n🎯 Testing facilities_list tool...');
      console.log('  - Name:', facilitiesListTool.name);
      console.log('  - API URL configured:', !!facilitiesListTool.apiBaseUrl);
      console.log('  - Schema valid:', !!(facilitiesListTool.schema && facilitiesListTool.schema.params));
      
      // Test tool execution with empty params
      console.log('\n🚀 Testing tool execution...');
      const result = await facilitiesListTool.execute({});
      console.log('  - Success:', result.success);
      if (result.success) {
        console.log('  - Data type:', typeof result.data);
        console.log('  - Data length:', Array.isArray(result.data) ? result.data.length : 'not array');
      } else {
        console.log('  - Error:', result.error?.message);
      }
    } else {
      console.log('\n❌ facilities_list tool not found');
    }
    
    console.log('\n✅ Tool registry test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testToolRegistry();
