import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../validation/validate-query';

const breedsQuerySchema = z.object({ q: z.string().trim().min(1).optional() });
const randomQuerySchema = z.object({
  breedId: z.string().trim().min(1).optional(),
});

export interface BreedRouterService<TBreed, TImage, TSpotlight> {
  getBreeds(query?: string): Promise<TBreed[]>;
  getBreed(id: string): Promise<TBreed>;
  getSpotlight(id: string): Promise<TSpotlight>;
  getRandomImage(breedId?: string): Promise<TImage>;
}

/**
 * Route wiring shared by `cat.routes.ts` and `dog.routes.ts` — both
 * expose the identical `/breeds`, `/breeds/:id`, `/breeds/:id/spotlight`,
 * `/random`, and `/of-the-day` shape. `getOfTheDay` is passed separately
 * since each service names it differently (`getCatOfTheDay` /
 * `getDogOfTheDay`).
 *
 * Express 5 forwards rejected promises from async handlers to the error
 * middleware automatically, so handlers stay plain `async` functions — no
 * `asyncHandler` wrapper needed.
 */
export function createBreedRouter<TBreed, TImage, TSpotlight>(
  service: BreedRouterService<TBreed, TImage, TSpotlight>,
  getOfTheDay: () => Promise<TSpotlight>,
): Router {
  const router = Router();

  router.get('/breeds', async (req, res) => {
    const { q } = validateQuery(breedsQuerySchema, req.query);
    res.json(await service.getBreeds(q));
  });

  router.get('/breeds/:id', async (req, res) => {
    res.json(await service.getBreed(req.params.id));
  });

  router.get('/breeds/:id/spotlight', async (req, res) => {
    res.json(await service.getSpotlight(req.params.id));
  });

  router.get('/random', async (req, res) => {
    const { breedId } = validateQuery(randomQuerySchema, req.query);
    res.json(await service.getRandomImage(breedId));
  });

  router.get('/of-the-day', async (_req, res) => {
    res.json(await getOfTheDay());
  });

  return router;
}
