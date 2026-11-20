export interface PawsApiClientOptions {
  baseUrl: string;
  timeoutMs: number;
}

/** Raised when paws-api returns a non-2xx response, returns non-JSON (502), is unreachable (502), or times out (504). */
export class PawsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PawsApiError';
  }
}

export type QueryParams = Record<string, string | undefined>;

/**
 * Thin HTTP client for paws-api. This is the only place in the MCP
 * server that knows paws-api's routes and URL shape — tool handlers
 * only ever talk to this class, the same repository-style boundary
 * paws-api itself uses for TheCatAPI / TheDogAPI.
 */
export class PawsApiClient {
  constructor(private readonly options: PawsApiClientOptions) {}

  // --- cats ---
  listCatBreeds(q?: string): Promise<unknown> {
    return this.get('/cats/breeds', { q });
  }
  getCatBreed(id: string): Promise<unknown> {
    return this.get(`/cats/breeds/${encodeURIComponent(id)}`);
  }
  getCatSpotlight(id: string): Promise<unknown> {
    return this.get(`/cats/breeds/${encodeURIComponent(id)}/spotlight`);
  }
  getRandomCatImage(breedId?: string): Promise<unknown> {
    return this.get('/cats/random', { breedId });
  }
  getCatOfTheDay(): Promise<unknown> {
    return this.get('/cats/of-the-day');
  }

  // --- dogs ---
  listDogBreeds(q?: string): Promise<unknown> {
    return this.get('/dogs/breeds', { q });
  }
  getDogBreed(id: string): Promise<unknown> {
    return this.get(`/dogs/breeds/${encodeURIComponent(id)}`);
  }
  getDogSpotlight(id: string): Promise<unknown> {
    return this.get(`/dogs/breeds/${encodeURIComponent(id)}/spotlight`);
  }
  getRandomDogImage(breedId?: string): Promise<unknown> {
    return this.get('/dogs/random', { breedId });
  }
  getDogOfTheDay(): Promise<unknown> {
    return this.get('/dogs/of-the-day');
  }

  // --- cross-species aggregates ---
  getRandomDuo(): Promise<unknown> {
    return this.get('/pets/random-duo');
  }
  compareBreeds(catBreedId: string, dogBreedId: string): Promise<unknown> {
    return this.get('/pets/compare', { catBreedId, dogBreedId });
  }
  getShowdown(): Promise<unknown> {
    return this.get('/pets/showdown');
  }
  getStats(): Promise<unknown> {
    return this.get('/pets/stats');
  }
  getPetOfTheDay(): Promise<unknown> {
    return this.get('/pets/of-the-day');
  }

  // --- schema ---
  getOpenApiSchema(): Promise<unknown> {
    return this.get('/openapi.json');
  }

  private async get(path: string, query?: QueryParams): Promise<unknown> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        // Error bodies are best-effort: a missing/garbled envelope just falls back to a generic message.
        const body: unknown = await res.json().catch(() => undefined);
        throw new PawsApiError(res.status, describeError(body, res.status, path));
      }
      // A 2xx body must parse — otherwise PAWS_API_URL likely points at something that isn't paws-api.
      return (await res.json()) as unknown;
    } catch (err) {
      if (err instanceof PawsApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new PawsApiError(504, `paws-api timed out for ${path}`);
      }
      // Checked by name, not `instanceof`: fetch's errors can come from another realm (e.g. under Jest).
      if ((err as Error | undefined)?.name === 'SyntaxError') {
        throw new PawsApiError(
          502,
          `${this.options.baseUrl} returned non-JSON for ${path} — is PAWS_API_URL pointing at paws-api?`,
        );
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new PawsApiError(
        502,
        `Failed to reach paws-api at ${this.options.baseUrl} — is it running? (${reason})`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const url = new URL(path.replace(/^\//, ''), `${this.options.baseUrl}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    return url.toString();
  }
}

/** paws-api's own error envelope is `{ statusCode, timestamp, path, message }` — `message` is a string[] for validation errors. */
function describeError(body: unknown, status: number, path: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return `paws-api responded with ${status} for ${path}`;
}
