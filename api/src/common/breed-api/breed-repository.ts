import type { TtlCache } from '../cache/ttl-cache';
import type { HttpClient } from '../http/http-client';

export interface BreedImageSearchParams {
  limit?: number;
  breedId?: string;
}

/**
 * Data-access layer shared by `CatRepository` and `DogRepository`. TheCatAPI
 * and TheDogAPI (same vendor) expose identical `/breeds`, `/breeds/search`,
 * `/breeds/{id}`, and `/images/search` shapes, so there's no per-species
 * behavior here — just the types differ, via `TBreed`/`TImage`.
 */
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

  /**
   * Prefers the cached breed list over a network round trip when it's already
   * warm. Ids arrive as path strings but TheDogAPI's are numbers, so compare
   * as strings.
   */
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
