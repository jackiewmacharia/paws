import { bestEffort, NotFoundError, notFoundOnUpstreamMiss } from '../../common/errors/http-error';
import { dailyPick } from '../../common/utils/daily-pick';
import { parseTraits } from '../../common/utils/temperament';
import { CatRepository } from './cat.repository';
import type { CatBreed, CatImage } from './cat.types';

export interface CatSpotlight {
  breed: CatBreed;
  image?: CatImage;
  funFact: string;
}

/**
 * Business logic for cats: talks to the CatRepository, translates
 * upstream quirks into a consistent API surface, and adds behaviour that
 * TheCatAPI doesn't provide directly (fun facts, "cat of the day").
 */
export class CatService {
  constructor(private readonly catRepository: CatRepository) {}

  async getBreeds(query?: string): Promise<CatBreed[]> {
    return query
      ? this.catRepository.searchBreeds(query)
      : this.catRepository.findAllBreeds();
  }

  async getBreed(id: string): Promise<CatBreed> {
    return notFoundOnUpstreamMiss(
      () => this.catRepository.findBreedById(id),
      `Cat breed '${id}' was not found`,
    );
  }

  async getRandomImage(breedId?: string): Promise<CatImage> {
    const [image] = await this.catRepository.searchImages({
      limit: 1,
      breedId,
    });
    if (!image) {
      throw new NotFoundError(
        breedId
          ? `No images found for cat breed '${breedId}'`
          : 'No cat images available right now',
      );
    }
    return image;
  }

  /**
   * Same breed + fun fact all day, changing at UTC midnight. The photo is a
   * fresh random pick per request, and is omitted if the image lookup fails.
   */
  async getCatOfTheDay(): Promise<CatSpotlight> {
    const breeds = await this.catRepository.findAllBreeds();
    const breed = dailyPick(breeds);
    const image = await bestEffort(this.getRandomImage(breed.id), `cat image for '${breed.id}'`);
    return { breed, image, funFact: buildFunFact(breed) };
  }

  async getSpotlight(id: string): Promise<CatSpotlight> {
    const breed = await this.getBreed(id);
    const image = await bestEffort(this.getRandomImage(breed.id), `cat image for '${breed.id}'`);
    return { breed, image, funFact: buildFunFact(breed) };
  }
}

function buildFunFact(breed: CatBreed): string {
  const trait = parseTraits(breed.temperament)[0]?.toLowerCase();
  const origin = breed.origin ? ` from ${breed.origin}` : '';

  if (breed.hairless === 1) {
    const traitSuffix = trait ? ` known for being ${trait}` : '';
    return `The ${breed.name}${origin} is a hairless breed${traitSuffix}.`;
  }
  if (trait) {
    return `The ${breed.name}${origin} is best known for being ${trait}.`;
  }
  return `The ${breed.name}${origin} is one of the many distinctive cat breeds catalogued by TheCatAPI.`;
}
