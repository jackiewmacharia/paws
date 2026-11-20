import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PawsApiClient } from './client/paws-api-client.js';

/**
 * Exposes paws-api's live OpenAPI document (`GET /openapi.json`)
 * as an MCP resource, so clients can read the full schema of the API this
 * server fronts without it being baked in statically here.
 */
export function registerResources(server: McpServer, client: PawsApiClient): void {
  server.registerResource(
    'paws-api-openapi-schema',
    'paws-api://openapi.json',
    {
      title: 'paws-api OpenAPI schema',
      description: "paws-api's OpenAPI 3.0 document, fetched live from its /openapi.json endpoint.",
      mimeType: 'application/json',
    },
    async (uri) => {
      const schema = await client.getOpenApiSchema();
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(schema, null, 2) }],
      };
    },
  );
}
