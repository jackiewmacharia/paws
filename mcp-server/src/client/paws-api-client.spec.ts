import { PawsApiClient, PawsApiError } from './paws-api-client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('PawsApiClient', () => {
  let fetchMock: jest.SpyInstance;
  let client: PawsApiClient;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    client = new PawsApiClient({ baseUrl: 'http://localhost:3000', timeoutMs: 1000 });
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('returns the parsed JSON body on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'beng', name: 'Bengal' }));
    await expect(client.getCatBreed('beng')).resolves.toEqual({ id: 'beng', name: 'Bengal' });
  });

  it('builds query params, skipping undefined values', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await client.listCatBreeds(undefined);

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/cats/breeds');
    expect(calledUrl.searchParams.has('q')).toBe(false);
  });

  it('includes provided query params', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await client.compareBreeds('beng', '1');

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('catBreedId')).toBe('beng');
    expect(calledUrl.searchParams.get('dogBreedId')).toBe('1');
  });

  it('surfaces paws-api error envelope message and status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 404, message: "Cat breed 'nope' was not found" }, 404));

    await expect(client.getCatBreed('nope')).rejects.toMatchObject({
      name: 'PawsApiError',
      status: 404,
      message: "Cat breed 'nope' was not found",
    });
  });

  it('joins array-shaped validation messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: ['dogBreedId: Required'] }, 400));
    await expect(client.compareBreeds('abys', '')).rejects.toMatchObject({ status: 400, message: 'dogBreedId: Required' });
  });

  it('falls back to a generic message when the error body has none, as a PawsApiError', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    await expect(client.getStats()).rejects.toThrow('paws-api responded with 500');
    await expect(client.getStats()).rejects.toBeInstanceOf(PawsApiError);
  });

  it('wraps network failures as a 502', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(client.getShowdown()).rejects.toMatchObject({ status: 502 });
  });

  it('wraps aborts/timeouts as a 504', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValue(abortError);

    await expect(client.getRandomDuo()).rejects.toMatchObject({ status: 504 });
  });

  it('rejects a 2xx response whose body is not JSON, instead of returning an empty success', async () => {
    fetchMock.mockResolvedValue(new Response('<!doctype html><html></html>', { status: 200 }));
    await expect(client.getStats()).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('returned non-JSON for /pets/stats'),
    });
  });

  it('reports a timeout while reading a 2xx body as a 504', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(abortError) } as Response);

    await expect(client.getStats()).rejects.toMatchObject({ status: 504 });
  });
});
