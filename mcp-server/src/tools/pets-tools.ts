import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PawsApiClient } from '../client/paws-api-client.js';
import { withErrorHandling } from './tool-result.js';

/** Registers the cross-species "fun aggregate" tools, backed by paws-api's `/pets/*` routes. */
export function registerPetsTools(server: McpServer, client: PawsApiClient): void {
  server.registerTool(
    'get_random_pet_duo',
    {
      title: 'Get a random cat + dog duo',
      description: 'Get one random cat photo and one random dog photo, side by side.',
    },
    async () => withErrorHandling(() => client.getRandomDuo()),
  );

  server.registerTool(
    'compare_pet_breeds',
    {
      title: 'Compare a cat breed and a dog breed',
      description:
        'Head-to-head comparison of a cat breed and a dog breed: life span, weight, and shared temperament traits.',
      inputSchema: {
        catBreedId: z.string().trim().min(1).describe('Cat breed id, e.g. "beng"'),
        dogBreedId: z.string().trim().min(1).describe('Dog breed id, e.g. "1"'),
      },
    },
    async ({ catBreedId, dogBreedId }) => withErrorHandling(() => client.compareBreeds(catBreedId, dogBreedId)),
  );

  server.registerTool(
    'get_pet_showdown',
    {
      title: 'Run a cat vs. dog showdown',
      description:
        'A random cat breed vs. a random dog breed, scored across 3 fun rounds (longevity, heft, temperament variety), with an overall winner.',
    },
    async () => withErrorHandling(() => client.getShowdown()),
  );

  server.registerTool(
    'get_pet_stats',
    {
      title: 'Get aggregate pet stats',
      description:
        'Aggregate stats across every catalogued cat and dog breed: average life span, longest-lived breed, most common temperament trait, per species.',
    },
    async () => withErrorHandling(() => client.getStats()),
  );

  server.registerTool(
    'get_pet_of_the_day',
    {
      title: 'Get the pet of the day',
      description: 'Get today\'s featured pet — alternates between a cat spotlight and a dog spotlight by date.',
    },
    async () => withErrorHandling(() => client.getPetOfTheDay()),
  );
}
