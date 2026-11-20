import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../../common/validation/validate-query';
import type { PetsService } from './pets.service';

const compareQuerySchema = z.object({
  catBreedId: z.string().trim().min(1, 'catBreedId is required'),
  dogBreedId: z.string().trim().min(1, 'dogBreedId is required'),
});

export function createPetsRouter(petsService: PetsService): Router {
  const router = Router();

  router.get('/random-duo', async (_req, res) => {
    res.json(await petsService.getRandomDuo());
  });

  router.get('/compare', async (req, res) => {
    const { catBreedId, dogBreedId } = validateQuery(
      compareQuerySchema,
      req.query,
    );
    res.json(await petsService.compareBreeds(catBreedId, dogBreedId));
  });

  router.get('/showdown', async (_req, res) => {
    res.json(await petsService.getShowdown());
  });

  router.get('/stats', async (_req, res) => {
    res.json(await petsService.getStats());
  });

  router.get('/of-the-day', async (_req, res) => {
    res.json(await petsService.getPetOfTheDay());
  });

  return router;
}
