import type { Router } from 'express';
import { createBreedRouter } from '../../common/breed-api/breed-router';
import type { DogService } from './dog.service';

export function createDogRouter(dogService: DogService): Router {
  return createBreedRouter(dogService, () => dogService.getDogOfTheDay());
}
