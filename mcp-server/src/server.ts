import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PawsApiClient } from './client/paws-api-client.js';
import { loadConfig } from './config/env.js';
import { registerResources } from './resources.js';
import { registerCatTools } from './tools/cat-tools.js';
import { registerDogTools } from './tools/dog-tools.js';
import { registerPawsTools } from './tools/paws-tools.js';

export function createServer(): McpServer {
  const config = loadConfig();
  const client = new PawsApiClient({ baseUrl: config.pawsApiUrl, timeoutMs: config.requestTimeoutMs });

  const server = new McpServer({ name: 'paws-mcp', version: '0.0.1' });

  registerCatTools(server, client);
  registerDogTools(server, client);
  registerPawsTools(server, client);
  registerResources(server, client);

  return server;
}
