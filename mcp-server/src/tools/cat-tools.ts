import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PawsApiClient } from '../client/paws-api-client.js';
import { withErrorHandling } from './tool-result.js';

export function registerCatTools(server: McpServer, client: PawsApiClient): void {
  server.registerTool(
    'list_cat_breeds',
    {
      title: 'List cat breeds',
      description: 'List all cat breeds known to paws-api, or search by name.',
      inputSchema: { q: z.string().trim().min(1).optional().describe('Case-insensitive name search, e.g. "bengal"') },
    },
    async ({ q }) => withErrorHandling(() => client.listCatBreeds(q)),
  );

  server.registerTool(
    'get_cat_breed',
    {
      title: 'Get a cat breed',
      description: 'Get full details for a single cat breed by its TheCatAPI id (e.g. "beng").',
      inputSchema: { id: z.string().trim().min(1) },
    },
    async ({ id }) => withErrorHandling(() => client.getCatBreed(id)),
  );

  server.registerTool(
    'get_cat_spotlight',
    {
      title: 'Get a cat breed spotlight',
      description: 'Get a cat breed bundled with a photo and a generated fun fact.',
      inputSchema: { id: z.string().trim().min(1) },
    },
    async ({ id }) => withErrorHandling(() => client.getCatSpotlight(id)),
  );

  server.registerTool(
    'get_random_cat_image',
    {
      title: 'Get a random cat image',
      description: 'Get a random cat photo, optionally restricted to one breed id.',
      inputSchema: { breedId: z.string().trim().min(1).optional() },
    },
    async ({ breedId }) => withErrorHandling(() => client.getRandomCatImage(breedId)),
  );

  server.registerTool(
    'get_cat_of_the_day',
    {
      title: 'Get the cat of the day',
      description: 'Get the featured cat breed for today — stable all day, changes at UTC midnight.',
    },
    async () => withErrorHandling(() => client.getCatOfTheDay()),
  );
}
