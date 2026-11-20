import type { Router } from 'express';
import { createBreedRouter } from '../../common/breed-api/breed-router';
import type { CatService } from './cat.service';

export function createCatRouter(catService: CatService): Router {
  return createBreedRouter(catService, () => catService.getCatOfTheDay());
}
