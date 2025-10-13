import { spawn } from 'child_process';

console.log('Testing MCP wrapper script...\n');

const server = spawn('/Users/yab/Projects/clear-ai-v2/mcp-wrapper.sh', []);

server.stderr.on('data', (data) => console.log('LOG:', data.toString().trim()));
server.stdout.on('data', (data) => {
  const str = data.toString();
  if (!str.includes('[dotenv')) console.log('OUT:', str.trim());
});

setTimeout(() => {
  console.log('\nSending initialize...');
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n');
}, 2000);

setTimeout(() => {
  console.log('Sending list tools...');
  server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n');
}, 3000);

setTimeout(() => {
  server.kill();
  console.log('\n✅ Wrapper script works!');
  process.exit(0);
}, 4000);
