import type { TtlCache } from '../cache/ttl-cache';
import type { HttpClient } from '../http/http-client';

export interface BreedImageSearchParams {
  limit?: number;
  breedId?: string;
}

/** TheCatAPI and TheDogAPI share a vendor and identical endpoints, so only the types differ. */
export class BreedRepository<TBreed extends { id: string | number }, TImage> {
  constructor(
    private readonly http: HttpClient,
    private readonly breedsCache: TtlCache<TBreed[]>,
  ) {}

  async findAllBreeds(): Promise<TBreed[]> {
    return this.breedsCache.getOrSet('all', () =>
      this.http.get<TBreed[]>('/breeds'),
    );
  }

  async searchBreeds(query: string): Promise<TBreed[]> {
    return this.http.get<TBreed[]>('/breeds/search', { q: query });
  }

  /** TheDogAPI's ids are numbers, so compare as strings. */
  async findBreedById(id: string): Promise<TBreed> {
    const cached = this.breedsCache
      .get('all')
      ?.find((breed) => String(breed.id) === id);
    if (cached) return cached;
    return this.http.get<TBreed>(`/breeds/${encodeURIComponent(id)}`);
  }

  async searchImages(params: BreedImageSearchParams = {}): Promise<TImage[]> {
    return this.http.get<TImage[]>('/images/search', {
      limit: params.limit ?? 1,
      breed_ids: params.breedId,
      has_breeds: params.breedId ? 1 : undefined,
    });
  }
}
