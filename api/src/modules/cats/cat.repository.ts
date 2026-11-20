import { BreedRepository } from '../../common/breed-api/breed-repository';
import type { CatBreed, CatImage } from './cat.types';

/** Data-access layer for TheCatAPI — see BreedRepository for the shared implementation. */
export class CatRepository extends BreedRepository<CatBreed, CatImage> {}
