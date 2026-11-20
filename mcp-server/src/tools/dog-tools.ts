import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PawsApiClient } from '../client/paws-api-client.js';
import { withErrorHandling } from './tool-result.js';

export function registerDogTools(server: McpServer, client: PawsApiClient): void {
  server.registerTool(
    'list_dog_breeds',
    {
      title: 'List dog breeds',
      description: 'List all dog breeds known to paws-api, or search by name.',
      inputSchema: { q: z.string().trim().min(1).optional().describe('Case-insensitive name search, e.g. "poodle"') },
    },
    async ({ q }) => withErrorHandling(() => client.listDogBreeds(q)),
  );

  server.registerTool(
    'get_dog_breed',
    {
      title: 'Get a dog breed',
      description: 'Get full details for a single dog breed by its TheDogAPI id (e.g. "1").',
      inputSchema: { id: z.string().trim().min(1) },
    },
    async ({ id }) => withErrorHandling(() => client.getDogBreed(id)),
  );

  server.registerTool(
    'get_dog_spotlight',
    {
      title: 'Get a dog breed spotlight',
      description: 'Get a dog breed bundled with a photo and a generated fun fact.',
      inputSchema: { id: z.string().trim().min(1) },
    },
    async ({ id }) => withErrorHandling(() => client.getDogSpotlight(id)),
  );

  server.registerTool(
    'get_random_dog_image',
    {
      title: 'Get a random dog image',
      description: 'Get a random dog photo, optionally restricted to one breed id.',
      inputSchema: { breedId: z.string().trim().min(1).optional() },
    },
    async ({ breedId }) => withErrorHandling(() => client.getRandomDogImage(breedId)),
  );

  server.registerTool(
    'get_dog_of_the_day',
    {
      title: 'Get the dog of the day',
      description: 'Get the featured dog breed for today — stable all day, changes at UTC midnight.',
    },
    async () => withErrorHandling(() => client.getDogOfTheDay()),
  );
}
