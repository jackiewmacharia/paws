import { BreedRepository } from '../../common/breed-api/breed-repository';
import type { DogBreed, DogImage } from './dog.types';

export class DogRepository extends BreedRepository<DogBreed, DogImage> {}
