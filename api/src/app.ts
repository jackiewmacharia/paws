import express, { type Express } from 'express';
import { TtlCache } from './common/cache/ttl-cache';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { HttpClient } from './common/http/http-client';
import { type AppConfig, loadConfig } from './config/env';
import { createCatRouter } from './modules/cats/cat.routes';
import { CatRepository } from './modules/cats/cat.repository';
import { CatService } from './modules/cats/cat.service';
import type { CatBreed } from './modules/cats/cat.types';
import { createDogRouter } from './modules/dogs/dog.routes';
import { DogRepository } from './modules/dogs/dog.repository';
import { DogService } from './modules/dogs/dog.service';
import type { DogBreed } from './modules/dogs/dog.types';
import { createHealthRouter } from './modules/health/health.routes';
import { HealthService } from './modules/health/health.service';
import { createPetsRouter } from './modules/pets/pets.routes';
import { PetsService } from './modules/pets/pets.service';
import { createDocsRouter } from './docs/docs.routes';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Builds and configures the Express app: wires the repository -> service ->
 * routes layers for each resource by hand (no DI framework) and mounts
 * their routers. `main.ts` is the only thing that calls `.listen()`.
 */
export function createApp(config: AppConfig = loadConfig()): Express {
  const app = express();

  // --- Repositories: the only layer that talks to the outside world ---
  const catHttpClient = new HttpClient({
    name: 'TheCatAPI',
    baseUrl: config.catApi.baseUrl,
    apiKey: config.catApi.apiKey,
    apiKeyHeader: 'x-api-key',
  });
  const dogHttpClient = new HttpClient({
    name: 'TheDogAPI',
    baseUrl: config.dogApi.baseUrl,
    apiKey: config.dogApi.apiKey,
    apiKeyHeader: 'x-api-key',
  });
  const catRepository = new CatRepository(
    catHttpClient,
    new TtlCache<CatBreed[]>(ONE_HOUR_MS),
  );
  const dogRepository = new DogRepository(
    dogHttpClient,
    new TtlCache<DogBreed[]>(ONE_HOUR_MS),
  );

  // --- Services: business logic, built on top of repositories ---
  const catService = new CatService(catRepository);
  const dogService = new DogService(dogRepository);
  const petsService = new PetsService(catService, dogService);
  const healthService = new HealthService();

  app.disable('x-powered-by');

  app.get('/', (_req, res) => {
    res.json({
      message: 'Welcome to paws-api — a mashup of TheCatAPI and TheDogAPI.',
      docs: '/docs',
      schema: '/openapi.json',
    });
  });

  app.use('/health', createHealthRouter(healthService));
  app.use('/cats', createCatRouter(catService));
  app.use('/dogs', createDogRouter(dogService));
  app.use('/pets', createPetsRouter(petsService));
  app.use(createDocsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
