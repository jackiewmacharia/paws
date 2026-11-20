import { bestEffort, NotFoundError, notFoundOnUpstreamMiss } from '../../common/errors/http-error';
import { dailyPick } from '../../common/utils/daily-pick';
import { parseTraits } from '../../common/utils/temperament';
import { DogRepository } from './dog.repository';
import type { DogBreed, DogImage } from './dog.types';

export interface DogSpotlight {
  breed: DogBreed;
  image?: DogImage;
  funFact: string;
}

export class DogService {
  constructor(private readonly dogRepository: DogRepository) {}

  async getBreeds(query?: string): Promise<DogBreed[]> {
    return query
      ? this.dogRepository.searchBreeds(query)
      : this.dogRepository.findAllBreeds();
  }

  async getBreed(id: string): Promise<DogBreed> {
    return notFoundOnUpstreamMiss(
      () => this.dogRepository.findBreedById(id),
      `Dog breed '${id}' was not found`,
    );
  }

  async getRandomImage(breedId?: string): Promise<DogImage> {
    const [image] = await this.dogRepository.searchImages({
      limit: 1,
      breedId,
    });
    if (!image) {
      throw new NotFoundError(
        breedId
          ? `No images found for dog breed '${breedId}'`
          : 'No dog images available right now',
      );
    }
    return image;
  }

  /** The breed is fixed per UTC day, but the photo is re-picked on every request. */
  async getDogOfTheDay(): Promise<DogSpotlight> {
    const breeds = await this.dogRepository.findAllBreeds();
    const breed = dailyPick(breeds);
    const image = await bestEffort(this.getRandomImage(String(breed.id)), `dog image for '${breed.id}'`);
    return { breed, image, funFact: buildFunFact(breed) };
  }

  async getSpotlight(id: string): Promise<DogSpotlight> {
    const breed = await this.getBreed(id);
    const image = await bestEffort(this.getRandomImage(String(breed.id)), `dog image for '${breed.id}'`);
    return { breed, image, funFact: buildFunFact(breed) };
  }
}

function buildFunFact(breed: DogBreed): string {
  const trait = parseTraits(breed.temperament)[0]?.toLowerCase();
  const origin = breed.origin ? ` from ${breed.origin}` : '';

  if (breed.bred_for) {
    return `The ${breed.name}${origin} was originally bred for ${breed.bred_for.toLowerCase()}.`;
  }
  if (trait) {
    return `The ${breed.name}${origin} is best known for being ${trait}.`;
  }
  return `The ${breed.name}${origin} is one of the many distinctive dog breeds catalogued by TheDogAPI.`;
}
