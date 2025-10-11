/**
 * Test script to verify LLM provider configuration and availability
 */

import { LLMProvider, getLLMConfigs } from '../src/shared/llm/index.js';

async function testLLMProviders() {
  console.log('🔧 Testing LLM Provider Configuration\n');
  
  // Get configurations
  const configs = getLLMConfigs();
  
  console.log(`📋 Found ${configs.length} LLM provider(s) configured:\n`);
  
  for (const config of configs) {
    const hasKey = config.api_key && config.api_key.length > 0;
    console.log(`  ${config.provider}: ${config.model}`);
    console.log(`    - API Key: ${hasKey ? '✓ Set' : '✗ Not set'}`);
    if (config.base_url) {
      console.log(`    - Base URL: ${config.base_url}`);
    }
  }
  
  console.log('\n🧪 Testing Provider Availability\n');
  
  const provider = new LLMProvider(configs);
  
  try {
    console.log('📤 Sending test message: "Hello! Please respond with just the word OK."\n');
    
    const response = await provider.generate({
      messages: [
        { role: 'user', content: 'Hello! Please respond with just the word OK.' }
      ],
      config: {
        max_tokens: 50,
        temperature: 0.1
      }
    });
    
    console.log('✅ SUCCESS! LLM Provider is working!\n');
    console.log('Response Details:');
    console.log(`  Provider: ${response.provider}`);
    console.log(`  Model: ${response.model}`);
    console.log(`  Content: "${response.content.trim()}"`);
    console.log(`  Latency: ${response.metadata.latency_ms}ms`);
    
    if (response.usage) {
      console.log(`  Tokens: ${response.usage.total_tokens} (${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion)`);
    }
    
    console.log('\n🎉 All systems operational!\n');
    
  } catch (error: any) {
    console.error('❌ ERROR: LLM Provider test failed\n');
    console.error(error.message);
    
    if (error.details) {
      console.error('\nDetails:', error.details);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Check that you have at least one API key set in .env');
    console.error('  2. Verify API keys are valid and not expired');
    console.error('  3. For Ollama, ensure the server is running: ollama serve');
    console.error('  4. Check your internet connection for cloud providers\n');
    
    process.exit(1);
  }
}

// Run the test
testLLMProviders().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

