import { ExternalApiError } from '../errors/http-error';
import { HttpClient } from './http-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpClient', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    jest.useRealTimers();
  });

  const client = (options: Partial<ConstructorParameters<typeof HttpClient>[0]> = {}) =>
    new HttpClient({ name: 'TheCatAPI', baseUrl: 'https://api.thecatapi.com/v1', ...options });

  const calledUrl = () => new URL(fetchMock.mock.calls[0][0] as string);
  const calledHeaders = () => (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;

  describe('requests', () => {
    it('keeps the base URL path prefix (no trailing slash needed)', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await client().get('/breeds');
      expect(calledUrl().href).toBe('https://api.thecatapi.com/v1/breeds');
    });

    it('sends query params, omitting undefined values', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await client().get('/images/search', { limit: 1, breed_ids: undefined, has_breeds: true });
      expect(calledUrl().searchParams.get('limit')).toBe('1');
      expect(calledUrl().searchParams.get('has_breeds')).toBe('true');
      expect(calledUrl().searchParams.has('breed_ids')).toBe(false);
    });

    it('sends the API key as x-api-key when one is configured', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await client({ apiKey: 'secret' }).get('/breeds');
      expect(calledHeaders()['x-api-key']).toBe('secret');
    });

    it('sends no API key header when none is configured', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await client().get('/breeds');
      expect(calledHeaders()).not.toHaveProperty('x-api-key');
    });

    it('returns the parsed JSON body on success', async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ id: 'abys' }]));
      await expect(client().get('/breeds')).resolves.toEqual([{ id: 'abys' }]);
    });
  });

  describe('errors', () => {
    it('reports an upstream non-2xx as a 502, keeping the upstream status separately', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Invalid API key' }, 401));
      const err = await client().get('/breeds').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ExternalApiError);
      expect(err).toMatchObject({ status: 502, upstreamStatus: 401, source: 'TheCatAPI', message: 'Invalid API key' });
    });

    it('uses a short plain-text error body as the message', async () => {
      fetchMock.mockResolvedValue(new Response('INVALID_DATA', { status: 400 }));
      await expect(client().get('/breeds/nope')).rejects.toMatchObject({ upstreamStatus: 400, message: 'INVALID_DATA' });
    });

    it('falls back to a generic message for long, empty, or message-less bodies', async () => {
      const generic = 'TheCatAPI responded with 500 for /breeds';
      for (const body of ['x'.repeat(500), '', JSON.stringify({ error: 'no message field' })]) {
        fetchMock.mockResolvedValueOnce(new Response(body, { status: 500 }));
        await expect(client().get('/breeds')).rejects.toMatchObject({ message: generic });
      }
    });

    it('reports a network failure as a 502 with no upstream status', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      await expect(client().get('/breeds')).rejects.toMatchObject({
        status: 502,
        upstreamStatus: undefined,
        message: 'Failed to reach TheCatAPI: fetch failed',
      });
    });

    it('aborts the request after timeoutMs and reports a 504', async () => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }),
      );

      const pending = client({ timeoutMs: 1000 }).get('/breeds');
      jest.advanceTimersByTime(1000);
      await expect(pending).rejects.toMatchObject({ status: 504, message: 'TheCatAPI timed out for /breeds' });
    });
  });
});
