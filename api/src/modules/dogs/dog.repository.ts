import { BreedRepository } from '../../common/breed-api/breed-repository';
import type { DogBreed, DogImage } from './dog.types';

/** Data-access layer for TheDogAPI — see BreedRepository for the shared implementation. */
export class DogRepository extends BreedRepository<DogBreed, DogImage> {}
