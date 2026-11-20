import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  catBreeds,
  dogBreeds,
  installFetchMock,
} from './support/fake-upstream';

describe('App (e2e)', () => {
  let app: Express;
  let fetchMock: jest.SpyInstance;

  beforeAll(() => {
    fetchMock = installFetchMock();
    app = createApp();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  describe('core', () => {
    it('/ (GET) welcomes and points at the docs', async () => {
      const res = await request(app).get('/').expect(200);
      expect(res.body).toMatchObject({
        docs: '/docs',
        schema: '/openapi.json',
      });
    });

    it('/health (GET)', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });

    it('/unknown (GET) returns a consistent 404 error envelope', async () => {
      const res = await request(app).get('/unknown').expect(404);
      expect(res.body).toMatchObject({ statusCode: 404, path: '/unknown' });
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('docs', () => {
    it('/openapi.json (GET) serves a schema describing every route', async () => {
      const res = await request(app).get('/openapi.json').expect(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.paths).toHaveProperty('/pets/showdown');
      expect(res.body.components.schemas).toHaveProperty('CatBreed');
    });

    it('/docs (GET) server-renders an HTML page pointing at the schema', async () => {
      const res = await request(app).get('/docs').expect(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('swagger-ui');
      expect(res.text).toContain('/openapi.json');
    });

    it('/docs and /openapi.json (GET) never echo the Host header', async () => {
      const evilHost = "x';alert(1);//";
      const page = await request(app).get('/docs').set('Host', evilHost).expect(200);
      expect(page.text).not.toContain('alert(1)');

      const schema = await request(app).get('/openapi.json').set('Host', evilHost).expect(200);
      expect(schema.body.servers).toEqual([{ url: '/' }]);
    });
  });

  describe('cats', () => {
    it('/cats/breeds (GET) lists breeds', async () => {
      const res = await request(app).get('/cats/breeds').expect(200);
      expect(res.body).toHaveLength(catBreeds.length);
      expect(res.body[0].name).toBe('Abyssinian');
    });

    it('/cats/breeds?q= (GET) filters by name', async () => {
      const res = await request(app)
        .get('/cats/breeds')
        .query({ q: 'beng' })
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('beng');
    });

    it('/cats/breeds/:id (GET) returns a single breed', async () => {
      const res = await request(app).get('/cats/breeds/abys').expect(200);
      expect(res.body.name).toBe('Abyssinian');
    });

    it('/cats/breeds/:id (GET) normalizes an unknown id to 404', async () => {
      const res = await request(app).get('/cats/breeds/nope').expect(404);
      expect(res.body.message).toContain("Cat breed 'nope' was not found");
    });

    it('/cats/breeds/:id/spotlight (GET) bundles breed + image + fun fact', async () => {
      const res = await request(app)
        .get('/cats/breeds/abys/spotlight')
        .expect(200);
      expect(res.body.breed.id).toBe('abys');
      expect(res.body.image.url).toContain('thecatapi');
      expect(typeof res.body.funFact).toBe('string');
    });

    it('/cats/random (GET) returns an image', async () => {
      const res = await request(app).get('/cats/random').expect(200);
      expect(res.body.url).toContain('thecatapi');
    });

    it('/cats/of-the-day (GET) is stable across requests within the same day', async () => {
      const first = await request(app).get('/cats/of-the-day').expect(200);
      const second = await request(app).get('/cats/of-the-day').expect(200);
      expect(second.body.breed.id).toBe(first.body.breed.id);
    });
  });

  describe('dogs', () => {
    it('/dogs/breeds (GET) lists breeds', async () => {
      const res = await request(app).get('/dogs/breeds').expect(200);
      expect(res.body).toHaveLength(dogBreeds.length);
    });

    it('/dogs/breeds/:id (GET) normalizes an unknown id to 404', async () => {
      const res = await request(app).get('/dogs/breeds/999').expect(404);
      expect(res.body.message).toContain("Dog breed '999' was not found");
    });

    it('/dogs/random (GET) returns an image', async () => {
      const res = await request(app).get('/dogs/random').expect(200);
      expect(res.body.url).toContain('thedogapi');
    });
  });

  describe('pets (aggregates)', () => {
    it('/pets/random-duo (GET) returns one cat image and one dog image', async () => {
      const res = await request(app).get('/pets/random-duo').expect(200);
      expect(res.body.cat.url).toContain('thecatapi');
      expect(res.body.dog.url).toContain('thedogapi');
    });

    it('/pets/compare (GET) requires both breed ids', async () => {
      const res = await request(app)
        .get('/pets/compare')
        .query({ catBreedId: 'abys' })
        .expect(400);
      expect(res.body.message.join(' ')).toContain('dogBreedId');
    });

    it('/pets/compare (GET) compares life span, weight, and shared temperament', async () => {
      const res = await request(app)
        .get('/pets/compare')
        .query({ catBreedId: 'abys', dogBreedId: '1' })
        .expect(200);

      expect(res.body.longerLivedSpecies).toBe('cat');
      expect(res.body.heavierSpecies).toBe('cat');
      expect(res.body.sharedTemperamentTraits).toEqual([]);
    });

    it('/pets/showdown (GET) runs a 3-round battle with a declared winner', async () => {
      const res = await request(app).get('/pets/showdown').expect(200);
      expect(res.body.rounds).toHaveLength(3);
      expect(['cat', 'dog', 'tie']).toContain(res.body.overallWinner);
      expect(res.body.cat.species).toBe('cat');
      expect(res.body.dog.species).toBe('dog');
    });

    it('/pets/stats (GET) aggregates across every catalogued breed', async () => {
      const res = await request(app).get('/pets/stats').expect(200);
      expect(res.body.cats).toMatchObject({
        breedCount: 2,
        averageLifeSpanYears: 14,
        longestLivedBreed: { name: 'Abyssinian', averageLifeSpanYears: 14.5 },
        mostCommonTemperamentTrait: { trait: 'energetic', breedCount: 2 },
      });
      expect(res.body.dogs).toMatchObject({
        breedCount: 2,
        averageLifeSpanYears: 12.5,
        longestLivedBreed: {
          name: 'Affenpinscher',
          averageLifeSpanYears: 13.5,
        },
      });
    });

    it('/pets/of-the-day (GET) alternates species and includes a spotlight', async () => {
      const res = await request(app).get('/pets/of-the-day').expect(200);
      expect(['cat', 'dog']).toContain(res.body.species);
      expect(res.body.spotlight.breed).toBeDefined();
      expect(typeof res.body.spotlight.funFact).toBe('string');
    });
  });

  describe('upstream failures', () => {
    let fakeUpstream: (input: RequestInfo | URL) => Promise<Response>;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      fakeUpstream = fetchMock.getMockImplementation()!;
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      fetchMock.mockImplementation(fakeUpstream);
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('reports an upstream 401 (e.g. a bad API key) as a 502, not as the caller being unauthorized', async () => {
      fetchMock.mockImplementation(async () =>
        new Response(JSON.stringify({ message: 'Invalid API key' }), { status: 401 }),
      );
      const res = await request(app).get('/cats/breeds?q=beng').expect(502);
      expect(res.body.message).toBe('Invalid API key');
    });

    it('still serves a spotlight without a photo when the image lookup fails, and logs why', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
        String(input).includes('/images/search')
          ? new Response('Too many requests', { status: 429 })
          : fakeUpstream(input),
      );
      const res = await request(app).get('/cats/breeds/abys/spotlight').expect(200);
      expect(res.body.breed.id).toBe('abys');
      expect(res.body.image).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("cat image for 'abys'"),
        expect.anything(),
      );
    });

    it('does not parse request bodies (malformed JSON is not a 500)', async () => {
      await request(app)
        .post('/cats/breeds')
        .set('Content-Type', 'application/json')
        .send('{bad')
        .expect(404);
    });
  });
});
