#!/usr/bin/env node
// Test MCP Server stdio communication (simulates what Cursor does)

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing MCP Server stdio communication...\n');

// Start MCP server as child process
const mcpServer = spawn('node', [join(__dirname, 'dist/main.js')], {
  env: {
    ...process.env,
    WASTEER_API_URL: 'http://localhost:4000/api'
  }
});

let outputBuffer = '';
let responseReceived = false;

mcpServer.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  
  // Check if we got a complete JSON-RPC response
  try {
    const lines = outputBuffer.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const response = JSON.parse(line);
        console.log('✅ Received MCP response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.result?.tools) {
          console.log(`\n🎉 SUCCESS! MCP server returned ${response.result.tools.length} tools`);
          console.log('\nFirst 5 tools:');
          response.result.tools.slice(0, 5).forEach((tool, i) => {
            console.log(`${i + 1}. ${tool.name} - ${tool.description}`);
          });
          responseReceived = true;
          mcpServer.kill();
          process.exit(0);
        }
      }
    }
  } catch (e) {
    // Not valid JSON yet, keep buffering
  }
});

mcpServer.stderr.on('data', (data) => {
  console.log('📋 MCP Server log:', data.toString().trim());
});

mcpServer.on('close', (code) => {
  if (!responseReceived) {
    console.log('\n❌ MCP server closed without sending tools response');
    console.log('This might be a stdio communication issue.');
    process.exit(1);
  }
});

// Send list_tools request after server starts
setTimeout(() => {
  console.log('📤 Sending list_tools request to MCP server...\n');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
  if (!responseReceived) {
    console.log('\n⏱️  Timeout: No response from MCP server after 10 seconds');
    console.log('This suggests a configuration or communication issue.');
    mcpServer.kill();
    process.exit(1);
  }
}, 10000);


