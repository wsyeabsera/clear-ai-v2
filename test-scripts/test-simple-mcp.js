import { spawn } from 'child_process';

const server = spawn('/Users/yab/.nvm/versions/node/v22.19.0/bin/yarn', 
  ['node', '/Users/yab/Projects/clear-ai-v2/dist/main.js'],
  { cwd: '/Users/yab/Projects/clear-ai-v2' }
);

server.stderr.on('data', (data) => console.log('LOG:', data.toString()));
server.stdout.on('data', (data) => console.log('OUT:', data.toString()));

setTimeout(() => {
  console.log('Sending initialize request...');
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n');
}, 2000);

setTimeout(() => {
  console.log('Sending list tools...');
  server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n');
}, 4000);

setTimeout(() => server.kill(), 6000);
