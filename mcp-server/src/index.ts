import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  // stdout carries the MCP protocol, so log to stderr only.
  await server.connect(transport);
  console.error('paws-mcp running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting paws-mcp:', err);
  process.exit(1);
});
