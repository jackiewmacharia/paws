import { BreedRepository } from '../../common/breed-api/breed-repository';
import type { CatBreed, CatImage } from './cat.types';

export class CatRepository extends BreedRepository<CatBreed, CatImage> {}
